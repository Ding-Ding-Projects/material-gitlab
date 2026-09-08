import { shallowMount } from '@vue/test-utils';
import { createServiceDeskAdapter } from '~/material_system/surfaces/Settings/service_desk_adapter';
import ServiceDeskSettings from '~/material_system/surfaces/Settings/components/ServiceDeskSettings.vue';

jest.mock('~/lib/utils/csrf', () => ({ token: 'csrf-value' }));
jest.mock('@gitlab/ui', () => ({
  GlAlert: {
    render(h) {
      return h('div', this.$slots.default);
    },
  },
  GlButton: {
    render(h) {
      return h('button', { on: this.$listeners }, this.$slots.default);
    },
  },
  GlForm: {
    render(h) {
      return h('form', { on: this.$listeners }, this.$slots.default);
    },
  },
  GlFormCheckbox: {
    render(h) {
      return h('input', { attrs: { type: 'checkbox' }, on: this.$listeners });
    },
  },
  GlFormGroup: {
    render(h) {
      return h('div', this.$slots.default);
    },
  },
  GlFormInput: {
    render(h) {
      return h('input');
    },
  },
  GlFormSelect: {
    render(h) {
      return h('select');
    },
  },
}));

const jsonResponse = (body, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  json: jest.fn().mockResolvedValue(body),
});
const serviceDeskResponse = (overrides = {}) => ({
  service_desk_enabled: false,
  service_desk_address: '',
  issue_template_key: null,
  outgoing_name: null,
  project_key: null,
  tickets_confidential_by_default: null,
  reopen_issue_on_external_participant_note: null,
  add_external_participants_from_cc: null,
  ...overrides,
});
const metadata = {
  allowed: true,
  endpoint: '/groups/a/-/service_desk',
  customEmailEndpoint: '/groups/a/-/service_desk/custom_email',
  issueTrackerEnabled: true,
  enabled: false,
  templates: [],
  ticketsConfidentialByDefault: true,
};

describe('Service Desk design adapter', () => {
  it('sends existing Service Desk fields with same-origin credentials and CSRF', async () => {
    const fetchImpl = jest.fn().mockResolvedValue(
      jsonResponse(
        serviceDeskResponse({
          service_desk_enabled: true,
          service_desk_address: 'help@example.test',
          outgoing_name: 'Support',
          tickets_confidential_by_default: true,
        }),
      ),
    );
    const adapter = createServiceDeskAdapter({
      endpoint: metadata.endpoint,
      customEmailEndpoint: metadata.customEmailEndpoint,
      allowed: true,
      fetchImpl,
    });
    await expect(
      adapter.save({ service_desk_enabled: true, outgoing_name: 'Support' }),
    ).resolves.toMatchObject({
      enabled: true,
      incomingEmail: 'help@example.test',
      outgoingName: 'Support',
    });
    expect(fetchImpl).toHaveBeenCalledWith(
      metadata.endpoint,
      expect.objectContaining({
        method: 'PUT',
        credentials: 'same-origin',
        headers: expect.objectContaining({ 'X-CSRF-Token': 'csrf-value' }),
      }),
    );
    expect(JSON.parse(fetchImpl.mock.calls[0][1].body)).toEqual({
      service_desk_enabled: true,
      outgoing_name: 'Support',
    });
  });

  it('uses the existing custom email route without ever requesting stored credentials', async () => {
    const fetchImpl = jest.fn().mockResolvedValue(
      jsonResponse({
        custom_email: 'help@example.test',
        custom_email_enabled: false,
        custom_email_verification_state: 'started',
        custom_email_smtp_address: 'smtp.example.test',
      }),
    );
    const adapter = createServiceDeskAdapter({
      endpoint: metadata.endpoint,
      customEmailEndpoint: metadata.customEmailEndpoint,
      allowed: true,
      fetchImpl,
    });
    const custom = await adapter.loadCustomEmail();
    expect(fetchImpl).toHaveBeenCalledWith(
      metadata.customEmailEndpoint,
      expect.objectContaining({ method: 'GET' }),
    );
    expect(custom).not.toHaveProperty('smtp_password');
    expect(custom).not.toHaveProperty('smtp_username');
  });

  it('awaits the real fetch Promise, rejects non-local routes, and refuses mutations without permission', async () => {
    const fetchImpl = jest
      .fn()
      .mockResolvedValue(jsonResponse(serviceDeskResponse({ service_desk_enabled: true })));
    const adapter = createServiceDeskAdapter({
      endpoint: metadata.endpoint,
      allowed: true,
      fetchImpl,
    });
    await expect(adapter.load()).resolves.toMatchObject({ enabled: true });
    expect(() =>
      createServiceDeskAdapter({
        endpoint: 'https://elsewhere.test/service_desk',
        allowed: true,
        fetchImpl,
      }),
    ).toThrow('local path');
    const forbidden = createServiceDeskAdapter({
      endpoint: metadata.endpoint,
      allowed: false,
      fetchImpl,
    });
    await expect(forbidden.save({ service_desk_enabled: true })).rejects.toThrow('permission');
  });

  it('does not reflect a custom-email failure body that could contain submitted credentials', async () => {
    const fetchImpl = jest
      .fn()
      .mockResolvedValue(
        jsonResponse({ message: 'password: exposed', smtp_password: 'secret' }, 422),
      );
    const adapter = createServiceDeskAdapter({
      endpoint: metadata.endpoint,
      customEmailEndpoint: metadata.customEmailEndpoint,
      allowed: true,
      fetchImpl,
    });
    await expect(adapter.saveCustomEmail({ smtp_password: 'secret' })).rejects.toThrow(
      'Custom email request failed',
    );
  });

  it('rejects malformed success responses rather than inventing disabled state', async () => {
    const fetchImpl = jest.fn().mockResolvedValue(jsonResponse({}));
    const adapter = createServiceDeskAdapter({
      endpoint: metadata.endpoint,
      allowed: true,
      fetchImpl,
    });
    await expect(adapter.load()).rejects.toThrow('invalid settings response');
  });

  it('keeps visible state server-refreshed after a successful save', async () => {
    const adapter = {
      load: jest.fn().mockResolvedValue({ enabled: false }),
      save: jest.fn().mockResolvedValue({
        enabled: true,
        incomingEmail: 'help@example.test',
        outgoingName: 'Support',
        ticketsConfidentialByDefault: true,
        reopenIssueOnExternalParticipantNote: false,
        addExternalParticipantsFromCc: false,
        issueTemplateKey: '',
        projectKey: '',
      }),
    };
    const wrapper = shallowMount(ServiceDeskSettings, { propsData: { metadata } });
    wrapper.setData({
      adapter,
      draft: { ...wrapper.vm.draft, enabled: true, outgoingName: 'Support' },
    });
    await wrapper.vm.save();
    expect(adapter.save).toHaveBeenCalledWith(
      expect.objectContaining({ service_desk_enabled: true, outgoing_name: 'Support' }),
    );
    expect(wrapper.vm.state.incomingEmail).toBe('help@example.test');
    expect(wrapper.vm.notice).toBe('Service Desk settings saved.');
  });

  it('keeps a custom-email error visible and does not claim success', async () => {
    const wrapper = shallowMount(ServiceDeskSettings, { propsData: { metadata } });
    wrapper.setData({
      adapter: {
        saveCustomEmail: jest.fn().mockRejectedValue(new Error('SMTP rejected')),
        load: jest.fn(),
      },
      state: { ...wrapper.vm.state, enabled: true },
    });
    await wrapper.vm.saveCustomEmail();
    expect(wrapper.vm.customError).toBe('SMTP rejected');
    expect(wrapper.vm.custom).toBeNull();
    expect(wrapper.vm.customDraft.smtp_password).toBe('');
  });

  it('does not mutate after permission is revoked or when a reset is cancelled', async () => {
    const wrapper = shallowMount(ServiceDeskSettings, { propsData: { metadata } });
    const adapter = { resetCustomEmail: jest.fn(), toggleCustomEmail: jest.fn(), load: jest.fn() };
    wrapper.setData({
      adapter,
      state: { ...wrapper.vm.state, enabled: true },
      custom: { custom_email: 'help@example.test' },
    });
    wrapper.vm.requestResetCustomEmail();
    expect(wrapper.vm.resetConfirmationOpen).toBe(true);
    wrapper.vm.cancelResetCustomEmail();
    expect(adapter.resetCustomEmail).not.toHaveBeenCalled();
    await wrapper.setProps({ metadata: { ...metadata, allowed: false } });
    await wrapper.vm.resetCustomEmail();
    await wrapper.vm.toggleCustomEmail(true);
    expect(adapter.resetCustomEmail).not.toHaveBeenCalled();
    expect(adapter.toggleCustomEmail).not.toHaveBeenCalled();
  });
});
