<script setup lang="ts">
import { Check, ArrowRight, ArrowLeft, CalendarCheck } from "lucide-vue-next";
import { useBookingFlow } from "../composables/useBookingFlow";
import BookingStepper from "../components/BookingStepper.vue";
import BookingCalendar from "../components/BookingCalendar.vue";
import AvailableTimeSlots from "../components/AvailableTimeSlots.vue";
import BookingSummary from "../components/BookingSummary.vue";
import ServiceCard from "../../services/components/ServiceCard.vue";
import StaffCard from "../../staff/components/StaffCard.vue";
import AsyncState from "../../../components/shared/AsyncState.vue";
import Button from "../../../components/ui/button/Button.vue";
import { dateLabel, timeLabel } from "../../../lib/utils";
const flow = useBookingFlow();
const {
  step,
  service,
  person,
  slot,
  month,
  selectedDate,
  notes,
  confirmation,
  business,
  services,
  staff,
  eligible,
  dates,
  slots,
  mutation,
  auth,
} = flow;
const headings = [
  "What feels right for you?",
  "Who will take care of you?",
  "Make a little time.",
  "Your moment, all together.",
];
</script>
<template>
  <div class="container booking-page">
    <template v-if="confirmation"
      ><div class="booking-confirmation">
        <span class="confirmation-check"><Check :size="32" /></span>
        <p class="eyebrow">A GOOD MOMENT IS ON THE CALENDAR</p>
        <h1>
          {{
            $route.query.reschedule
              ? "A new time, just for you."
              : "We’ll see you soon."
          }}
        </h1>
        <p>
          Your appointment is confirmed and saved.<br />A little calm is on its
          way.
        </p>
        <div class="confirmation-ticket">
          <CalendarCheck :size="28" />
          <div>
            <h3>{{ confirmation.service_name }}</h3>
            <p>With {{ confirmation.staff_name }}</p>
            <strong
              >{{
                dateLabel(confirmation.start_at, business.data.value?.timezone)
              }}<br />{{
                timeLabel(confirmation.start_at, business.data.value?.timezone)
              }}</strong
            ><small>Appointment #{{ confirmation.id }}</small>
          </div>
        </div>
        <Button as-child
          ><RouterLink
            :to="
              auth.user?.role === 'customer'
                ? '/account'
                : '/dashboard/calendar'
            "
            >View my appointments <ArrowRight :size="17" /></RouterLink
        ></Button></div></template
    ><template v-else
      ><div class="booking-intro">
        <p class="eyebrow">YOUR NEXT GOOD MOMENT</p>
        <h1>A little care starts here.</h1>
        <p class="muted">
          Choose your treatment. Find your person. We’ll take care of the rest.
        </p>
      </div>
      <BookingStepper
        :step="step"
        :minimum-step="$route.query.reschedule ? 2 : 0"
        @go="step = $event" />
      <div class="booking-layout">
        <div class="booking-main">
          <div class="booking-step-title">
            <button
              v-if="step > 0 && !$route.query.reschedule"
              class="icon-button"
              aria-label="Previous step"
              @click="step--"
            >
              <ArrowLeft :size="20" />
            </button>
            <div>
              <p class="eyebrow">STEP {{ step + 1 }} OF 4</p>
              <h2>{{ headings[step] }}</h2>
            </div>
          </div>
          <template v-if="step === 0"
            ><AsyncState
              :loading="services.isPending.value"
              :error="services.error.value"
              @retry="services.refetch()"
              ><div class="grid-2">
                <ServiceCard
                  v-for="item in services.data.value"
                  :key="item.id"
                  :service="item"
                  compact
                  :selected="service?.id === item.id"
                  @select="flow.selectService"
                /></div></AsyncState></template
          ><template v-else-if="step === 1"
            ><p class="muted">
              All of these professionals offer {{ service?.name }}.
            </p>
            <AsyncState
              :loading="staff.isPending.value"
              :error="staff.error.value"
              :empty="!eligible?.length"
              empty-text="No professionals currently offer this treatment. Please choose another service."
              @retry="staff.refetch()"
              ><div class="grid-2">
                <StaffCard
                  v-for="item in eligible"
                  :key="item.id"
                  :staff="item"
                  selectable
                  :selected="person?.id === item.id"
                  @select="flow.selectStaff"
                /></div></AsyncState></template
          ><template v-else-if="step === 2"
            ><p class="muted">
              All times are in {{ business.data.value?.timezone }}.
            </p>
            <AsyncState
              :loading="dates.isPending.value"
              :error="dates.error.value"
              @retry="dates.refetch()"
              ><BookingCalendar
                :month="month"
                :selected="selectedDate"
                :dates="dates.data.value || []"
                @month="
                  month = $event;
                  selectedDate = '';
                  slot = '';
                "
                @select="flow.selectDate" /></AsyncState
            ><template v-if="selectedDate"
              ><h3 class="times-heading">
                Available times · {{ selectedDate }}
              </h3>
              <AsyncState
                :loading="slots.isPending.value"
                :error="slots.error.value"
                @retry="slots.refetch()"
                ><AvailableTimeSlots
                  :slots="slots.data.value?.slots || []"
                  :selected="slot"
                  :timezone="business.data.value?.timezone || 'Europe/London'"
                  @select="slot = $event" /></AsyncState
            ></template>
            <div class="booking-next">
              <Button :disabled="!slot" @click="step = 3"
                >Review your appointment <ArrowRight :size="17"
              /></Button></div></template
          ><template v-else
            ><div class="review-panel">
              <h3>{{ service?.name }}</h3>
              <p>With {{ person?.display_name }}</p>
              <p v-if="slot">
                {{ dateLabel(slot, business.data.value?.timezone) }}<br />{{
                  timeLabel(slot, business.data.value?.timezone)
                }}
              </p>
              <label class="field"
                >Anything we should know? <span class="muted">(optional)</span
                ><textarea
                  v-model="notes"
                  maxlength="1000"
                  rows="4"
                  placeholder="Your preferences, any areas to focus on…"
                />
              </label>
              <p class="policy-note">
                By confirming, you agree to give at least
                {{ business.data.value?.cancellation_hours }} hours’ notice for
                cancellation or rescheduling. You’ll pay at the studio.
              </p>
              <p v-if="mutation.error.value" class="form-error" role="alert">
                {{ mutation.error.value.message }}
              </p>
              <Button
                :disabled="mutation.isPending.value || !slot"
                @click="mutation.mutate()"
                >{{
                  mutation.isPending.value
                    ? "Saving your appointment…"
                    : auth.user
                      ? "Confirm appointment"
                      : "Sign in to confirm"
                }}
                <Check :size="17" /></Button
              ><button
                v-if="mutation.error.value"
                class="text-link"
                @click="
                  slot = '';
                  step = 2;
                "
              >
                Choose another time
              </button>
            </div></template
          >
        </div>
        <BookingSummary
          :service="service"
          :staff="person"
          :slot="slot"
          :timezone="business.data.value?.timezone || 'Europe/London'"
          :cutoff="business.data.value?.cancellation_hours || 12"
        /></div
    ></template>
  </div>
</template>
