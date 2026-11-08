<script setup lang="ts">
import {
  ArrowUpRight,
  ArrowRight,
  Star,
  Leaf,
  Heart,
  CalendarDays,
  Check,
  Plus,
} from "lucide-vue-next";
import { useServices, useStaff, useBusiness } from "../services/api";
import ServiceCard from "../services/components/ServiceCard.vue";
import StaffCard from "../staff/components/StaffCard.vue";
import AsyncState from "../../components/shared/AsyncState.vue";
import Button from "../../components/ui/button/Button.vue";
const services = useServices(),
  staff = useStaff(),
  business = useBusiness();
</script>
<template>
  <section class="hero container">
    <div class="hero-copy">
      <p class="eyebrow">
        <span class="tiny-leaf"><Leaf :size="13" /></span> YOUR WELLBEING,
        THOUGHTFULLY CONSIDERED
      </p>
      <h1>A little time,<br /><em>entirely yours.</em></h1>
      <p class="hero-description">
        Step away from the everyday. Discover personalised<br
          class="desktop-only"
        />
        treatments and meaningful moments of calm, with<br
          class="desktop-only"
        />
        people who care.
      </p>
      <div class="hero-actions">
        <Button as-child
          ><RouterLink to="/book"
            >Find your moment <ArrowUpRight :size="18" /></RouterLink></Button
        ><RouterLink to="/services" class="text-link"
          >Explore our services <ArrowRight :size="17"
        /></RouterLink>
      </div>
      <div class="hero-trust">
        <div class="avatar-stack">
          <img src="/images/olivia.svg" alt="" /><img
            src="/images/sofia.svg"
            alt=""
          /><img src="/images/james.svg" alt="" />
        </div>
        <div>
          <div class="stars">
            <Star v-for="n in 5" :key="n" :size="11" fill="currentColor" />
          </div>
          <span>A little care. A lasting difference.</span
          ><small>Fictional client stories, real attention to detail.</small>
        </div>
      </div>
    </div>
    <div class="hero-visual">
      <img
        src="/images/studio.svg"
        alt="A sunlit wellness studio with a treatment bed, warm stone walls and leafy plants"
        class="hero-image"
        fetchpriority="high"
      />
      <div class="hero-image-label">
        <span class="pulse-dot" /> A SPACE TO SLOW DOWN
      </div>
      <div class="hero-note">
        <span class="note-icon"><Leaf :size="20" :stroke-width="1.3" /></span>
        <div>
          <strong>Your calm starts here.</strong
          ><span>Expert care. Personal attention.</span>
        </div>
        <span class="note-spark">✧</span>
      </div>
      <span class="vertical-note">SERENO STUDIO · LONDON</span>
    </div>
  </section>
  <div class="values-strip">
    <div class="container">
      <span><Leaf :size="18" /> Thoughtful, personal care</span><i>✧</i
      ><span><Heart :size="18" /> Experts who understand you</span><i>✧</i
      ><span><CalendarDays :size="18" /> Book easily, breathe freely</span
      ><i>✧</i><span><Check :size="18" /> Your wellbeing comes first</span>
    </div>
  </div>
  <section class="section container">
    <div class="section-heading">
      <div>
        <p class="eyebrow">MAKE SPACE FOR YOURSELF</p>
        <h2>Care that meets you <em>where you are.</em></h2>
        <p class="muted">
          From a restorative reset to your everyday ritual. Find what feels
          right.
        </p>
      </div>
      <RouterLink to="/services" class="text-link"
        >View all services <ArrowUpRight :size="18"
      /></RouterLink>
    </div>
    <AsyncState
      :loading="services.isPending.value"
      :error="services.error.value"
      @retry="services.refetch()"
      ><div class="grid-4">
        <ServiceCard
          v-for="service in services.data.value?.slice(0, 4)"
          :key="service.id"
          :service="service"
        /></div
    ></AsyncState>
    <div class="service-footnote">
      <Plus :size="14" /> Your time is precious. Every session is tailored to
      you.
    </div>
  </section>
  <section class="how-section">
    <div class="container how-layout">
      <div>
        <p class="eyebrow">LESS PLANNING. MORE LIVING.</p>
        <h2>Your next good moment,<br /><em>three simple steps away.</em></h2>
        <p class="muted">
          No back-and-forth. No waiting on hold.<br />Just a little more time
          for what matters.
        </p>
        <RouterLink to="/book" class="text-link"
          >Let's make time for you <ArrowRight :size="18"
        /></RouterLink>
      </div>
      <div class="steps-list">
        <article
          v-for="(step, i) in [
            [
              'Find your treatment',
              'Explore our services and choose what your body and mind need.',
            ],
            [
              'Choose your person & time',
              'Find your professional, then a moment that fits your day.',
            ],
            [
              'Arrive. Exhale. Enjoy.',
              'We’ll take care of the details. You just need to be here.',
            ],
          ]"
          :key="i"
        >
          <span class="step-number">0{{ i + 1 }}</span>
          <div>
            <h3>{{ step[0] }}</h3>
            <p>{{ step[1] }}</p>
          </div>
          <ArrowUpRight :size="20" />
        </article>
      </div>
    </div>
  </section>
  <section class="section container">
    <div class="section-heading">
      <div>
        <p class="eyebrow">GOOD HANDS. KIND PEOPLE.</p>
        <h2>A personal touch.<br /><em>A professional difference.</em></h2>
      </div>
      <RouterLink to="/team" class="text-link"
        >Meet the whole team <ArrowUpRight :size="18"
      /></RouterLink>
    </div>
    <AsyncState
      :loading="staff.isPending.value"
      :error="staff.error.value"
      @retry="staff.refetch()"
      ><div class="grid-3">
        <StaffCard
          v-for="person in staff.data.value?.slice(0, 3)"
          :key="person.id"
          :staff="person"
        /></div
    ></AsyncState>
  </section>
  <section id="studio" class="studio-section container">
    <div class="studio-art">
      <img
        src="/images/studio.svg"
        alt="The warm, quiet interior of our fictional wellness studio"
        loading="lazy"
      /><span class="studio-sticker">YOUR EVERYDAY<br /><em>escape.</em></span>
    </div>
    <div class="studio-copy">
      <p class="eyebrow">WELCOME TO YOUR PAUSE</p>
      <h2>A small sanctuary.<br /><em>A world of difference.</em></h2>
      <p>
        In the heart of a busy city, we’ve created somewhere you can simply be.
        Warm spaces, thoughtful details, and care that puts you first.
      </p>
      <p>
        Our approach is simple: listen closely, care deeply, and make every
        visit feel like it was made for you.
      </p>
      <div class="studio-address">
        <span>COME FIND YOUR CALM</span
        ><strong>{{ business.data.value?.address }}</strong>
        <p>
          {{ business.data.value?.phone }}<br />Monday – Saturday, 9am – 7pm
        </p>
      </div>
      <Button as-child variant="outline"
        ><RouterLink to="/book"
          >Plan your visit <ArrowUpRight :size="16" /></RouterLink
      ></Button>
    </div>
  </section>
  <section class="section container testimonials">
    <p class="eyebrow">LITTLE MOMENTS. LOVELY WORDS.</p>
    <h2>Feel better. <em>In good company.</em></h2>
    <div class="grid-3">
      <article
        v-for="(review, i) in [
          [
            'From the moment I walked in, I felt like I could finally slow down. Olivia’s signature massage was just what I needed.',
            'Emma W.',
            'The Signature Massage',
          ],
          [
            'Such a thoughtful, welcoming space. Sofia really listened and my skin has never felt more cared for.',
            'Mia T.',
            'Radiance Facial',
          ],
          [
            'A brilliant way to reset after a long week. Easy to book, lovely people, and a little peace I didn’t know I needed.',
            'Oliver R.',
            'Mindful Movement',
          ],
        ]"
        :key="i"
        class="review-card"
      >
        <div class="stars">
          <Star v-for="n in 5" :key="n" :size="13" fill="currentColor" />
        </div>
        <blockquote>“{{ review[0] }}”</blockquote>
        <strong>{{ review[1] }}</strong
        ><span>{{ review[2] }}</span>
      </article>
    </div>
    <small class="muted">Fictional testimonials for this demonstration.</small>
  </section>
  <section class="final-cta container">
    <span class="cta-flower">✳</span>
    <p class="eyebrow">YOU DON’T NEED A REASON</p>
    <h2>Make a little room <em>for you.</em></h2>
    <p>Your next moment of calm is closer than you think.</p>
    <Button as-child
      ><RouterLink to="/book"
        >Book your next good moment
        <ArrowUpRight :size="18" /></RouterLink></Button
    ><span class="cta-note">We’ll take care of the rest.</span>
  </section>
</template>
