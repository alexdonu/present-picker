<!-- Decorative arch with a setting sun, and a round stamp pinned to its corner. -->
<template>
  <div class="relative self-center pt-7 xl:pt-10">
    <svg viewBox="0 0 460 600" class="block h-auto w-[300px] sm:w-[360px] xl:w-[460px]" aria-hidden="true" focusable="false">
      <defs>
        <clipPath id="hero-arch"><path d="M0 600V230A230 230 0 0 1 460 230V600Z" /></clipPath>
      </defs>
      <g clip-path="url(#hero-arch)">
        <rect x="0" y="0" width="460" height="600" fill="var(--color-forest)" />
        <path
          d="M230 600L927 539M230 600L912 443M230 600L884 349M230 600L842 261M230 600L789 179M230 600L725 105M230 600L651 41M230 600L569 -12M230 600L481 -54M230 600L387 -82M230 600L291 -97M230 600L193 -99M230 600L96 -87M230 600L2 -62M230 600L-88 -24M230 600L-172 27M230 600L-247 88M230 600L-314 159M230 600L-370 239M230 600L-414 326M230 600L-446 419M230 600L-465 515"
          stroke="var(--color-paper)"
          stroke-width="1.6"
          opacity="0.35"
        />
        <circle cx="230" cy="600" r="104" fill="var(--color-sun)" />
        <circle cx="230" cy="600" r="136" fill="none" stroke="var(--color-sun)" stroke-width="1.8" opacity="0.7" />
        <circle cx="230" cy="600" r="168" fill="none" stroke="var(--color-sun)" stroke-width="1.8" opacity="0.45" />
      </g>
      <path d="M18 600V232A212 212 0 0 1 442 232V600" fill="none" stroke="var(--color-paper)" stroke-width="1.4" opacity="0.5" />
    </svg>

    <svg
      viewBox="0 0 190 190"
      class="absolute left-[-24px] top-0 block w-[124px] rotate-[-14deg] xl:left-[-72px] xl:w-[190px]"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <path id="hero-ring" d="M95 95m-72 0a72 72 0 1 1 144 0a72 72 0 1 1 -144 0" />
      </defs>
      <circle cx="95" cy="95" r="92" fill="var(--color-paper)" stroke="var(--color-ink)" stroke-width="1.6" />
      <text font-family="var(--font-mono)" font-size="12.5" letter-spacing="4.5" fill="var(--color-ink)">
        <textPath href="#hero-ring">PETRECERE DE CASĂ NOUĂ · VINO ȘI TU · </textPath>
      </text>
      <path d="M65 102a30 25 0 0 1 60 0z" fill="var(--color-burgundy)" />
      <circle cx="95" cy="108" r="3.5" fill="var(--color-burgundy)" />
      <circle cx="95" cy="115" r="3.5" fill="var(--color-burgundy)" />
      <circle cx="95" cy="122" r="3.5" fill="var(--color-burgundy)" />
      <path d="M84 129h22" stroke="var(--color-burgundy)" stroke-width="3" stroke-linecap="round" />
    </svg>
  </div>
</template>
