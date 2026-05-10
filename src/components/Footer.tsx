/**
 * Global footer.
 *
 * Carries the CC BY 4.0 attributions required by the licenses of every
 * 3D asset shown in the configurator. Per CC BY 4.0 §3(a) the credit
 * must be reasonably visible — listing each work and author with links
 * to both the original and the license satisfies the "reasonable means"
 * clause.
 */
export function Footer() {
  return (
    <footer className="border-t border-garage-700 bg-garage-900/80 text-garage-300 text-xs">
      <div className="max-w-7xl mx-auto px-6 py-5 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="flex-shrink-0">
          <span className="font-semibold text-garage-100">E30 Forge</span>
          <span className="text-garage-500"> · v0.1 proof-of-concept</span>
        </div>

        <div className="text-garage-400 leading-relaxed max-w-2xl md:text-right space-y-1">
          <div>
            Car:{' '}
            <CreditLink
              href="https://sketchfab.com/3d-models/bmw-m3-e30-6d67d12a2abe4e119842f65e46fa2f67"
              text="BMW M3 E30"
            />{' '}
            by{' '}
            <CreditLink href="https://sketchfab.com/temp0.crazy" text="Artem P" />
          </div>
          <div>
            Showroom:{' '}
            <CreditLink
              href="https://sketchfab.com/3d-models/car-showroom-2-e7a3497e8a7c487e906b2d8814b018f0"
              text="Car-Showroom 2"
            />{' '}
            by <CreditLink href="https://sketchfab.com/polsaris" text="Polsaris" />
          </div>
          <div>
            LED Studio:{' '}
            <CreditLink
              href="https://sketchfab.com/3d-models/studio-v1-for-car-9c45d19a7d434e2ca1640d6d2146e895"
              text="Studio V1 For Car"
            />{' '}
            by{' '}
            <CreditLink
              href="https://sketchfab.com/velocity.motion"
              text="Velocity Motion"
            />
          </div>
          <div className="text-garage-500">
            All Sketchfab assets licensed under{' '}
            <CreditLink
              href="https://creativecommons.org/licenses/by/4.0/"
              text="CC BY 4.0"
            />
            . Photography from Pexels &amp; Unsplash.
          </div>
        </div>
      </div>
    </footer>
  );
}

function CreditLink({ href, text }: { href: string; text: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-garage-200 hover:text-accent transition-colors underline-offset-2 hover:underline"
    >
      {text}
    </a>
  );
}
