import { GlModal } from '@gitlab/ui';
import { nextTick } from 'vue';
import { mountExtended } from 'helpers/vue_test_utils_helper';
import GroupsProjectsDeleteModal from '~/groups_projects/components/delete_modal.vue';
import PermanentDeletionConfirmCheckbox from '~/groups_projects/components/permanent_deletion_confirm_checkbox.vue';
import SuperConfirmation from '~/material_system/components/super_confirmation.vue';
import { stubComponent } from 'helpers/stub_component';
import { useFakeDate } from 'helpers/fake_date';
import { RESOURCE_TYPES } from '~/groups_projects/constants';

jest.mock('lodash-es', () => ({
  ...jest.requireActual('lodash-es'),
  uniqueId: (prefix) => `${prefix}fake-id`,
}));

describe('GroupsProjectsDeleteModal', () => {
  useFakeDate(2025, 9, 29);

  let wrapper;

  const defaultPropsData = {
    resourceType: RESOURCE_TYPES.PROJECT,
    visible: false,
    confirmPhrase: 'foo',
    confirmLoading: false,
    fullName: 'Foo / Bar',
    markedForDeletion: false,
    permanentDeletionDate: '2025-11-28',
  };

  const createComponent = (propsData) => {
    wrapper = mountExtended(GroupsProjectsDeleteModal, {
      propsData: {
        ...defaultPropsData,
        ...propsData,
      },
      stubs: {
        GlModal: stubComponent(GlModal),
      },
      scopedSlots: {
        alert: '<div data-testid="alert-slot"></div>',
        'restore-help-page-link':
          '<div data-testid="restore-help-page-link">{{ props.content }}</div>',
      },
    });
  };

  const findGlModal = () => wrapper.findComponent(GlModal);
  const findSuperConfirmation = () => wrapper.findComponent(SuperConfirmation);
  const findModalBodyMessage = () => wrapper.findByTestId('modal-body-message');
  const findPermanentDeletionCheckbox = () =>
    wrapper.findComponent(PermanentDeletionConfirmCheckbox);

  describe.each`
    resourceType              | expectedDeleteDelayedMessage                                                                                                                                                                   | expectedDeletePermanentlyMessage
    ${RESOURCE_TYPES.PROJECT} | ${`This action will place this project, including all its resources, in a pending deletion state for 30 days, and delete it permanently on ${defaultPropsData.permanentDeletionDate}.`}        | ${`This project is scheduled for deletion on ${defaultPropsData.permanentDeletionDate}. This action will permanently delete this project, including all its resources, immediately. This action cannot be undone.`}
    ${RESOURCE_TYPES.GROUP}   | ${`This action will place this group, including its subgroups and projects, in a pending deletion state for 30 days, and delete it permanently on ${defaultPropsData.permanentDeletionDate}.`} | ${`This group is scheduled for deletion on ${defaultPropsData.permanentDeletionDate}. This action will permanently delete this group, including its subgroups and projects, immediately. This action cannot be undone.`}
  `(
    'when resourceType is $resourceType',
    ({ resourceType, expectedDeleteDelayedMessage, expectedDeletePermanentlyMessage }) => {
      it('renders modal with correct props', () => {
        createComponent({ resourceType });

        expect(findGlModal().props()).toMatchObject({
          visible: defaultPropsData.visible,
          modalId: `delete-modal-fake-id`,
        });
        expect(findGlModal().props('actionPrimary')).toBeFalsy();
        expect(findSuperConfirmation().props('target')).toBe(defaultPropsData.confirmPhrase);
      });

      describe('when markedForDeletion prop is false', () => {
        beforeEach(() => {
          createComponent({ resourceType });
        });

        it('renders message', () => {
          expect(findModalBodyMessage().text()).toContain(expectedDeleteDelayedMessage);
        });
      });

      describe('when markedForDeletion prop is true', () => {
        it('renders message', () => {
          createComponent({ resourceType, markedForDeletion: true });

          expect(findModalBodyMessage().text()).toContain(expectedDeletePermanentlyMessage);
        });

        it('does not render permanent deletion checkbox', () => {
          createComponent({ resourceType, markedForDeletion: true });

          expect(findPermanentDeletionCheckbox().exists()).toBe(false);
        });

        describe.each`
          description                                                                 | gon
          ${'groupProjectPermanentDeletionConfirmation saas feature is enabled'}      | ${{ saas_features: { groupProjectPermanentDeletionConfirmation: true } }}
          ${'groupProjectPermanentDeletionConfirmation dedicated feature is enabled'} | ${{ dedicated_features: { groupProjectPermanentDeletionConfirmation: true } }}
        `('when $description', ({ gon }) => {
          beforeEach(() => {
            window.gon = gon;

            createComponent({ resourceType, markedForDeletion: true });
          });

          it('renders the permanent deletion checkbox', () => {
            expect(findPermanentDeletionCheckbox().exists()).toBe(true);
            expect(findPermanentDeletionCheckbox().props('resourceType')).toBe(resourceType);
          });

          it.each`
            checked  | ready
            ${false} | ${false}
            ${true}  | ${true}
          `('unlocks the slider only when the checkbox is $checked', async ({ checked, ready }) => {
            findPermanentDeletionCheckbox().vm.$emit('change', checked);
            await nextTick();

            expect(findSuperConfirmation().props('ready')).toBe(ready);
          });
        });
      });
    },
  );

  it('renders alert slot', () => {
    createComponent();

    expect(wrapper.findByTestId('alert-slot').exists()).toBe(true);
  });

  it('names what is affected and has nothing to type', () => {
    createComponent();

    expect(wrapper.text()).toContain(`This affects: ${defaultPropsData.confirmPhrase}`);
    expect(wrapper.find('input[type="text"]').exists()).toBe(false);
  });

  it('emits `primary` when the super confirmation authorizes', () => {
    createComponent();

    findSuperConfirmation().vm.$emit('authorized');

    expect(wrapper.emitted('primary')).toEqual([[]]);
  });

  it('closes on emergency exit', () => {
    createComponent();

    findSuperConfirmation().vm.$emit('exit');

    expect(wrapper.emitted('change')).toEqual([[false]]);
  });

  it('emits `change` event', () => {
    createComponent();

    findGlModal().vm.$emit('change', true);

    expect(wrapper.emitted('change')).toEqual([[true]]);
  });

  it('renders aria-label', () => {
    createComponent();

    expect(findGlModal().props('ariaLabel')).toBe('Delete Foo / Bar');
  });

  it('when confirmLoading switches from true to false, emits `change event`', async () => {
    createComponent({ confirmLoading: true });

    // setProps is justified here because we are testing the component's
    // reactive behavior which constitutes an exception
    // See https://docs.gitlab.com/ee/development/fe_guide/style/vue.html#setting-component-state
    wrapper.setProps({ confirmLoading: false });

    await nextTick();

    expect(wrapper.emitted('change')).toEqual([[false]]);
  });

  describe('when modal is closed then re-opened', () => {
    it('resets the keys, slider and checkbox', async () => {
      window.gon = { saas_features: { groupProjectPermanentDeletionConfirmation: true } };
      createComponent({ markedForDeletion: true });

      findGlModal().vm.$emit('change', true);
      await wrapper.findByTestId('super-confirmation-key-1').trigger('click');
      findPermanentDeletionCheckbox().vm.$emit('change', true);

      findGlModal().vm.$emit('change', false);
      findGlModal().vm.$emit('change', true);
      await nextTick();

      expect(wrapper.findByTestId('super-confirmation-key-1').attributes('aria-checked')).toBe(
        'false',
      );
      expect(findPermanentDeletionCheckbox().props('checked')).toBe(false);
    });
  });
});
