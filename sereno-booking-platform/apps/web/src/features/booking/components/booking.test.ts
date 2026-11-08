// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import BookingStepper from "./BookingStepper.vue";
import AvailableTimeSlots from "./AvailableTimeSlots.vue";
import { adjacentMonth, monthPadding } from "./BookingCalendar.vue";
import StatusBadge from "../../../components/shared/StatusBadge.vue";
import { addDays, localDate, timeLabel, money } from "../../../lib/utils";

describe("Booking navigation", () => {
  it("allows returning to earlier steps and prevents skipping forward", async () => {
    const wrapper = mount(BookingStepper, { props: { step: 1 } });
    const buttons = wrapper.findAll("button");
    expect(buttons[2]!.attributes("disabled")).toBeDefined();
    await buttons[0]!.trigger("click");
    expect(wrapper.emitted("go")).toEqual([[0]]);
    expect(buttons[1]!.attributes("aria-current")).toBe("step");
  });
  it("emits the exact UTC slot while presenting the business timezone", async () => {
    const slot = "2026-07-01T09:00:00Z";
    const wrapper = mount(AvailableTimeSlots, {
      props: { slots: [slot], selected: "", timezone: "Europe/London" },
    });
    expect(wrapper.text()).toContain("10:00");
    await wrapper.get("button").trigger("click");
    expect(wrapper.emitted("select")).toEqual([[slot]]);
  });
  it("shows a useful empty state", () => {
    const wrapper = mount(AvailableTimeSlots, {
      props: { slots: [], selected: "", timezone: "Europe/London" },
    });
    expect(wrapper.text()).toContain("Choose another day");
    expect(wrapper.findAll("button")).toHaveLength(0);
  });
});

describe("Calendar and presentation", () => {
  it("navigates across year boundaries", () => {
    expect(adjacentMonth("2026-12", 1)).toBe("2027-01");
    expect(adjacentMonth("2026-01", -1)).toBe("2025-12");
    expect(monthPadding("2026-02")).toBe(6);
  });
  it("uses calendar arithmetic independent of DST", () => {
    expect(addDays("2026-03-28", 2)).toBe("2026-03-30");
    expect(localDate(new Date("2026-02-01T22:00:00Z"), "Asia/Tehran")).toBe(
      "2026-02-02",
    );
    expect(timeLabel("2026-10-25T01:30:00Z", "Europe/London")).toContain(
      "01:30",
    );
    expect(money(8500)).toBe("£85");
  });
  it("renders accessible status text without relying only on color", () => {
    const wrapper = mount(StatusBadge, { props: { status: "no_show" } });
    expect(wrapper.text()).toBe("no show");
    expect(wrapper.classes()).toContain("no_show");
  });
});
