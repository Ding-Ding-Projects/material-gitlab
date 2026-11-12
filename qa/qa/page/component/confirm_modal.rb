# frozen_string_literal: true

module QA
  module Page
    module Component
      module ConfirmModal
        extend QA::Page::PageConcern

        def self.included(base)
          super

          base.view 'app/assets/javascripts/lib/utils/confirm_via_gl_modal/confirm_modal.vue' do
            element 'confirm-ok-button'
            element 'confirmation-modal'
          end

          base.view 'app/assets/javascripts/material_system/components/super_confirmation.vue' do
            element 'super-confirmation'
            element 'super-confirmation-slider'
            element 'super-confirmation-exit'
          end
        end

        # Destructive actions use the two-key, slide-to-confirm gate. Nothing is typed, so the
        # text argument is accepted for compatibility and ignored.
        def fill_confirmation_text(_text = nil)
          click_element('super-confirmation-key-1')
          click_element('super-confirmation-key-2')
        end

        def wait_for_confirm_button_enabled
          wait_until(reload: false) do
            !element_disabled?('super-confirmation-slider')
          end
        end

        def confirm_transfer
          wait_for_confirm_button_enabled
          page.execute_script(<<~JS)
            const slider = document.querySelector('[data-testid="super-confirmation-slider"]');
            slider.value = '100';
            slider.dispatchEvent(new Event('input', { bubbles: true }));
            slider.dispatchEvent(new Event('change', { bubbles: true }));
          JS
        end

        def click_confirmation_ok_button
          click_element('confirm-ok-button')
        end

        # Click the confirmation button if the confirmation modal is present
        # Can be used when the modal may not always appear in a test. For example, if the modal is behind a feature flag
        #
        # @return [void]
        def click_confirmation_ok_button_if_present
          # In the case of changing access levels[1], the modal appears while there's a request in process, so we need
          # to skip the loading check otherwise it will time out.
          #
          # [1]: https://gitlab.com/gitlab-org/gitlab/-/blob/4a99af809b86047ce3c8985e6582748bbd23fc84/qa/qa/page/component/members/members_table.rb#L54
          return unless has_element?('confirmation-modal')

          click_element('confirm-ok-button')
        end
      end
    end
  end
end
