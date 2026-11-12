import { GlModal } from '@gitlab/ui';
import { nextTick } from 'vue';
import {
  CONFIRM_DANGER_MODAL_ID,
  CONFIRM_DANGER_MODAL_TITLE,
  CONFIRM_DANGER_WARNING,
} from '~/vue_shared/components/confirm_danger/constants';
import ConfirmDangerModal from '~/vue_shared/components/confirm_danger/confirm_danger_modal.vue';
import SuperConfirmation from '~/material_system/components/super_confirmation.vue';
import { shallowMountExtended } from 'helpers/vue_test_utils_helper';

describe('Confirm Danger Modal', () => {
  const confirmDangerMessage = 'This is a dangerous activity';
  const phrase = 'You must construct additional pylons';
  const modalId = CONFIRM_DANGER_MODAL_ID;

  let wrapper;

  const findModal = () => wrapper.findComponent(GlModal);
  const findConfirmationPhrase = () => wrapper.findByTestId('confirm-danger-phrase');
  const findSuperConfirmation = () => wrapper.findComponent(SuperConfirmation);
  const findAdditionalMessage = () => wrapper.findByTestId('confirm-danger-message');

  const createComponent = ({ props = {}, provide = {}, slots = {} } = {}) => {
    wrapper = shallowMountExtended(ConfirmDangerModal, {
      propsData: { modalId, phrase, visible: false, ...props },
      provide,
      slots,
    });
  };

  describe('with injected data', () => {
    beforeEach(() => {
      createComponent({ provide: { confirmDangerMessage } });
    });

    it('names exactly what is affected', () => {
      expect(findConfirmationPhrase().text()).toBe(`This affects: ${phrase}`);
    });

    it('preserves whitespace in the phrase', () => {
      expect(wrapper.find('code').classes()).toContain('gl-whitespace-pre-wrap');
    });

    it('renders any additional messages', () => {
      expect(findAdditionalMessage().text()).toBe(confirmDangerMessage);
    });
  });

  describe('without injected data', () => {
    beforeEach(() => {
      createComponent();
    });

    it('does not render any additional messages', () => {
      expect(findAdditionalMessage().exists()).toBe(false);
    });

    it('renders the default warning and title', () => {
      expect(wrapper.findByTestId('confirm-danger-warning').text()).toBe(CONFIRM_DANGER_WARNING);
      expect(findModal().props('title')).toBe(CONFIRM_DANGER_MODAL_TITLE);
    });
  });

  describe('super confirmation', () => {
    beforeEach(() => {
      createComponent();
    });

    it('asks for nothing to be typed', () => {
      expect(wrapper.find('input[type="text"]').exists()).toBe(false);
      expect(findModal().props('actionPrimary')).toBeFalsy();
    });

    it('passes the phrase as the target', () => {
      expect(findSuperConfirmation().props('target')).toBe(phrase);
    });

    it('emits confirm when the gate authorizes', () => {
      findSuperConfirmation().vm.$emit('authorized');
      expect(wrapper.emitted('confirm')).toHaveLength(1);
    });

    it('hides the modal on emergency exit', () => {
      const hide = jest.fn();
      wrapper.vm.$refs.modal.hide = hide;
      findSuperConfirmation().vm.$emit('exit');
      expect(hide).toHaveBeenCalled();
    });
  });

  it('closes when loading finishes', async () => {
    createComponent({ props: { confirmLoading: true } });
    await wrapper.setProps({ confirmLoading: false });
    await nextTick();
    expect(wrapper.emitted('change')).toEqual([[false]]);
  });

  it('renders the modal-body slot', () => {
    createComponent({ slots: { 'modal-body': '<div data-testid="custom-body">Custom</div>' } });
    expect(wrapper.findByTestId('custom-body').exists()).toBe(true);
  });
});
