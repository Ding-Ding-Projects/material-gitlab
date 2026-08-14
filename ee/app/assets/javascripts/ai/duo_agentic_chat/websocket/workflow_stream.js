import {
  WS_CLOSE_GOING_AWAY,
  WS_CLOSE_INVALID_REQUEST,
  WS_CLOSE_NORMAL,
  WS_CLOSE_POLICY_VIOLATION,
  WS_CLOSE_TRY_AGAIN_LATER,
} from '../constants';
import StreamWorker from './stream_worker?worker';
import { BufferedEventHub } from './buffered_event_hub';
import { BufferOverflowError } from './buffer_overflow_error';
import { DWS_MOCK_WEBSOCKET_ENABLED, exposeMockSocket } from './dws_mock_websocket';

export const WORKFLOW_STREAM_STATES = Object.freeze({
  IDLE: 'idle',
  CONNECTING: 'connecting',
  OPENED: 'opened',
  CLOSED: 'closed',
  ERROR: 'error',
});

// Maps WebSocket close codes to categorised close descriptors.
// Codes absent from the map are treated as transient errors (retryable).
const CLOSE_CODE_CATEGORIES = new Map([
  [WS_CLOSE_NORMAL, { category: 'normal', retryable: false }],
  [WS_CLOSE_GOING_AWAY, { category: 'going_away', retryable: true }],
  [WS_CLOSE_POLICY_VIOLATION, { category: 'policy_violation', retryable: false }],
  // Another tab is already streaming this workflow, so retrying would fight it.
  [WS_CLOSE_TRY_AGAIN_LATER, { category: 'try_again_later', retryable: false }],
  [WS_CLOSE_INVALID_REQUEST, { category: 'invalid_request', retryable: false }],
]);

function categorizeCloseCode(code) {
  return CLOSE_CODE_CATEGORIES.get(code) ?? { category: 'error', retryable: true };
}

export function toAbsoluteWebSocketUrl(relativeUrl) {
  if (relativeUrl.startsWith('ws://') || relativeUrl.startsWith('wss://')) {
    return relativeUrl;
  }
  if (typeof window === 'undefined') {
    return relativeUrl;
  }
  const url = new URL(relativeUrl, window.location.href);
  // eslint-disable-next-line @gitlab/require-i18n-strings
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  return url.href;
}

export class WorkflowStream {
  #state = WORKFLOW_STREAM_STATES.IDLE;
  #url = null;
  #initialMessage = null;
  #worker = null;
  #hub = new BufferedEventHub(['message']);
  #workflowStatus = null;

  // Arrow function field so it can be passed to addEventListener without binding.
  #handleWorkerMessage = ({ data }) => {
    switch (data.type) {
      case 'open':
        this.#state = WORKFLOW_STREAM_STATES.OPENED;
        this.#hub.$emit('open', data);
        break;
      case 'message': {
        const status = data.data?.newCheckpoint?.status;
        if (status !== undefined) {
          this.#workflowStatus = status;
        }
        this.#emitMessage(data);
        break;
      }
      case 'close':
        this.#handleClose(data);
        break;
      case 'error':
        this.#hub.$emit('error', data);
        break;
      default:
        break;
    }
  };

  get state() {
    return this.#state;
  }

  get url() {
    return this.#url;
  }

  get initialMessage() {
    return this.#initialMessage;
  }

  get workflowStatus() {
    return this.#workflowStatus;
  }

  connect(url, initialMessage) {
    this.#url = toAbsoluteWebSocketUrl(url);
    this.#initialMessage = initialMessage;
    this.#hub.clear();
    this.#workflowStatus = null;
    this.#state = WORKFLOW_STREAM_STATES.CONNECTING;

    this.#ensureWorker();
    this.#worker.postMessage({ type: 'connect', url: this.#url, initialMessage });
  }

  send(message) {
    if (this.#worker) {
      this.#worker.postMessage({ type: 'send', message });
    }
  }

  disconnect() {
    if (this.#worker) {
      this.#worker.postMessage({ type: 'disconnect' });
    }
    // `stream_worker` drops its socket reference before the socket's own close
    // event fires, and its `socket === ws` guard then suppresses that event, so
    // nothing will report this close back to us. Record it here or the stream
    // keeps claiming to be open with no socket behind it.
    this.#state = WORKFLOW_STREAM_STATES.CLOSED;
    this.#hub.clear();
  }

  subscribe(eventType, callback) {
    return this.#hub.subscribe(eventType, callback);
  }

  getStatus() {
    return {
      connected: this.#state === WORKFLOW_STREAM_STATES.OPENED,
      state: this.#state,
      bufferedCount: this.#hub.count,
      workflowStatus: this.#workflowStatus,
    };
  }

  terminate() {
    if (this.#worker) {
      this.#worker.postMessage({ type: 'disconnect' });
      this.#worker.removeEventListener('message', this.#handleWorkerMessage);
      this.#worker.terminate();
      this.#worker = null;
    }
    this.#state = WORKFLOW_STREAM_STATES.IDLE;
    this.#workflowStatus = null;
    this.#hub.dispose();
  }

  // A full buffer means the backlog outgrew the connection it was meant to
  // replay, so the oldest events are the ones worth losing. Drop them and emit
  // again: the buffer is empty by then, so the retry cannot overflow, and the
  // message that triggered this is both buffered and delivered as normal.
  #emitMessage(data) {
    try {
      this.#hub.$emit('message', data);
    } catch (e) {
      if (!(e instanceof BufferOverflowError)) {
        throw e;
      }
      this.#hub.clear();
      this.#hub.$emit('message', data);
    }
  }

  #ensureWorker() {
    if (!this.#worker) {
      this.#worker = new StreamWorker();
      this.#worker.addEventListener('message', this.#handleWorkerMessage);

      if (DWS_MOCK_WEBSOCKET_ENABLED) {
        exposeMockSocket(() => this.#worker);
      }
    }
  }

  #handleClose(data) {
    const { category, retryable } = categorizeCloseCode(data.code);
    this.#state = retryable ? WORKFLOW_STREAM_STATES.ERROR : WORKFLOW_STREAM_STATES.CLOSED;
    // The buffer only exists to replay the current connection, so it is stale
    // the moment that connection ends. Bounding its lifetime this way is also
    // what keeps it from ever reaching the overflow limit in practice.
    this.#hub.clear();
    this.#hub.$emit('close', { ...data, category, retryable });
  }
}
