# frozen_string_literal: true

# Drives the destructive super-confirmation (two key switches, a slide-to-confirm
# slider, and an emergency exit) the way a person does. Nothing is typed.
module SuperConfirmationHelpers
  def complete_super_confirmation
    within_super_confirmation do
      find_by_testid('super-confirmation-key-1').click
      find_by_testid('super-confirmation-key-2').click
    end

    slide_super_confirmation_to(100)
  end

  def slide_super_confirmation_to(percent)
    page.execute_script(<<~JS, percent)
      const slider = document.querySelector('[data-testid="super-confirmation-slider"]');
      slider.value = String(arguments[0]);
      slider.dispatchEvent(new Event('input', { bubbles: true }));
      slider.dispatchEvent(new Event('change', { bubbles: true }));
    JS
  end

  def emergency_exit_super_confirmation
    within_super_confirmation { find_by_testid('super-confirmation-exit').click }
  end

  private

  def within_super_confirmation(&block)
    within(find_by_testid('super-confirmation'), &block)
  end
end
