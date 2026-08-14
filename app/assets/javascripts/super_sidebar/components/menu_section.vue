<script>
import { kebabCase } from 'lodash-es';
import {
  GlCollapse,
  GlIcon,
  GlAnimatedChevronRightDownIcon,
  GlTooltipDirective,
  GlOutsideDirective as Outside,
} from '@gitlab/ui';
import { HIDDEN_NAV_ITEM_CLASS } from '../constants';
import NavItem from './nav_item.vue';
import FlyoutMenu from './flyout_menu.vue';

export default {
  name: 'MenuSection',
  components: {
    GlCollapse,
    GlIcon,
    GlAnimatedChevronRightDownIcon,
    NavItem,
    FlyoutMenu,
  },
  directives: { Outside, GlTooltip: GlTooltipDirective },
  inject: {
    isIconOnly: { default: false },
  },
  props: {
    item: {
      type: Object,
      required: true,
    },
    expanded: {
      type: Boolean,
      required: false,
      default: false,
    },
    tag: {
      type: String,
      required: false,
      default: 'div',
    },
    hasFlyout: {
      type: Boolean,
      required: false,
      default: false,
    },
    headerless: {
      type: Boolean,
      required: false,
      default: false,
    },
    asyncCount: {
      type: Object,
      required: false,
      default: () => ({}),
    },
  },
  emits: ['collapse-toggle', 'nav-link-click', 'pin-add', 'pin-remove'],
  data() {
    return {
      isExpanded: Boolean(this.headerless || this.expanded || this.item.is_active),
      isMouseOverSection: false,
      isMouseOverFlyout: false,
      keepFlyoutClosed: false,
    };
  },
  computed: {
    navItems() {
      return this.item.items.filter((item) => {
        if (item.link_classes) {
          return !item.link_classes.includes(HIDDEN_NAV_ITEM_CLASS);
        }
        return true;
      });
    },
    buttonProps() {
      const usesFlyout = this.isIconOnly && this.hasFlyout;

      return {
        'aria-controls': usesFlyout ? `menu-section-button-${this.itemId}-flyout` : this.itemId,
        'aria-expanded': String(usesFlyout ? this.showFlyout : this.isExpanded),
        'aria-haspopup': usesFlyout ? 'menu' : null,
        'data-qa-menu-item': this.item.title,
      };
    },
    computedLinkClasses() {
      return {
        'with-mouse-over-flyout': this.isMouseOverFlyout,
        'm3-shell-nav-section-active': this.isActive,
      };
    },
    isActive() {
      return (!this.isExpanded || this.isIconOnly) && this.item.is_active;
    },
    itemId() {
      return kebabCase(this.item.title);
    },
    isMouseOver() {
      return this.isMouseOverSection || this.isMouseOverFlyout;
    },
    showExpanded() {
      return !this.isIconOnly && this.isExpanded;
    },
    showFlyout() {
      return (
        !this.headerless &&
        this.hasFlyout &&
        this.isMouseOver &&
        !this.showExpanded &&
        !this.keepFlyoutClosed &&
        this.navItems.length > 0
      );
    },
  },
  watch: {
    isExpanded(newIsExpanded) {
      this.$emit('collapse-toggle', newIsExpanded);
      this.keepFlyoutClosed = !newIsExpanded && !this.isIconOnly;
      if (!newIsExpanded) {
        this.isMouseOverFlyout = false;
      }
    },
    isIconOnly(newIsIconOnly) {
      // Reset keepFlyoutClosed when toggling between expanded/collapsed sidebar
      if (newIsIconOnly) {
        this.keepFlyoutClosed = false;
      }
    },
  },
  methods: {
    handleClick() {
      if (this.isIconOnly) {
        this.isMouseOverSection = !this.isMouseOverSection; // Allows touch devices to open the flyout menus by touch
        return;
      }
      this.isExpanded = !this.isExpanded;
    },
    handleClickOutside(targetId) {
      this.isMouseOverSection = false; // Allows touch devices to close the flyout menus by touch
      if (targetId) {
        document.getElementById(targetId)?.focus();
      }
    },
    handlePointerover(e) {
      if (!this.hasFlyout) return;

      this.isMouseOverSection = e.pointerType === 'mouse' || e.pointerType === 'pen';
    },
    handlePointerleave(e) {
      if (!this.hasFlyout) return;

      this.keepFlyoutClosed = false;

      // delay state change. otherwise the flyout menu gets removed before it
      // has a chance to emit its mouseover event.
      // checks pointer type to not mess with touch devices, which fire a pointerleave event before
      // every click!
      if (e.pointerType === 'mouse' || e.pointerType === 'pen') {
        setTimeout(() => {
          this.isMouseOverSection = false;
        }, 5);
      }
    },
  },
};
</script>

<template>
  <component :is="tag">
    <button
      v-if="!headerless"
      :id="`menu-section-button-${itemId}`"
      v-outside="handleClickOutside"
      v-gl-tooltip.right.viewport="isIconOnly ? item.title : ''"
      type="button"
      class="gl-nav-item m3-shell-nav-section gl-relative"
      :class="computedLinkClasses"
      data-testid="menu-section-button"
      :data-qa-section-name="item.title"
      :aria-label="item.title"
      v-bind="buttonProps"
      @click="handleClick"
      @keydown.esc="handleClickOutside"
      @pointerover="handlePointerover"
      @pointerleave="handlePointerleave"
    >
      <span v-show="isIconOnly" class="m3-shell-nav-section-icon">
        <gl-icon :name="item.icon" />
      </span>
      <span v-show="!isIconOnly" class="gl-truncate-end menu-section-button-label">
        {{ item.title }}
      </span>
      <gl-animated-chevron-right-down-icon
        v-show="!isIconOnly"
        class="m3-shell-nav-section-chevron"
        :is-on="isExpanded"
      />
    </button>

    <flyout-menu
      v-if="showFlyout"
      :target-id="`menu-section-button-${itemId}`"
      :title="item.title"
      :items="navItems"
      :async-count="asyncCount"
      @mouseover="isMouseOverFlyout = true"
      @mouseleave="isMouseOverFlyout = false"
      @pin-add="(itemId, itemTitle) => $emit('pin-add', itemId, itemTitle)"
      @pin-remove="(itemId, itemTitle) => $emit('pin-remove', itemId, itemTitle)"
      @nav-link-click="$emit('nav-link-click')"
      @nav-item-keydown-esc="handleClickOutside"
      @nav-pin-keydown-esc="handleClickOutside"
    />

    <gl-collapse
      :id="itemId"
      v-model="isExpanded"
      :class="{ 'gl-hidden': isIconOnly && !headerless }"
      class="m3-shell-nav-section-items gl-m-0 gl-list-none gl-p-0 gl-transition-[height] gl-duration-medium gl-ease-ease"
      data-testid="menu-section"
      :data-qa-section-name="item.title"
    >
      <slot>
        <ul :aria-label="item.title" class="gl-m-0 gl-list-none gl-p-0">
          <nav-item
            v-for="subItem of navItems"
            :key="`${item.title}-${subItem.title}`"
            :item="subItem"
            :async-count="asyncCount"
            @pin-add="(itemId, itemTitle) => $emit('pin-add', itemId, itemTitle)"
            @pin-remove="(itemId, itemTitle) => $emit('pin-remove', itemId, itemTitle)"
          />
        </ul>
      </slot>
    </gl-collapse>
  </component>
</template>
