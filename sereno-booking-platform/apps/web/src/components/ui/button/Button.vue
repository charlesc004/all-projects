<script setup lang="ts">
import { Primitive, type PrimitiveProps } from "reka-ui";
import { cva } from "class-variance-authority";
import { cn } from "../../../lib/utils";
import type { HTMLAttributes } from "vue";
interface Props extends PrimitiveProps {
  variant?: "default" | "outline" | "ghost" | "danger";
  size?: "default" | "sm" | "icon";
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), {
  as: "button",
  variant: "default",
  size: "default",
});
const variants = cva("btn", {
  variants: {
    variant: {
      default: "btn-primary",
      outline: "btn-outline",
      ghost: "btn-ghost",
      danger: "btn-danger",
    },
    size: { default: "", sm: "btn-sm", icon: "btn-icon" },
  },
});
</script>
<template>
  <Primitive
    :as="as"
    :as-child="asChild"
    :class="cn(variants({ variant, size }), props.class)"
    ><slot
  /></Primitive>
</template>
