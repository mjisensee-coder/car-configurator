/**
 * Global footer.
 *
 * Carries the CC BY 4.0 attribution for the BMW M3 E30 GLB by Artem P,
 * which is required by the model's license whenever we display the work.
 *
 * Per CC BY 4.0 §3(a): the credit must be reasonably visible. Linking to
 * both the original work and the author satisfies the "reasonable means"
 * clause.
 */
export function Footer() {
  return (
    <footer className="border-t border-garage-700 bg-garage-900/80 text-garage-300 text-xs">
      <div className="max-w-7xl mx-auto px-6 py-5 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <span className="font-semibold text-garage-100">E30 Forge</span>
          <span className="text-garage-500"> · v0.1 proof-of-concept</span>
        </div>

        <div className="text-garage-400 leading-relaxed max-w-2xl md:text-right">
          3D model:{' '}
          <a
            href="https://sketchfab.com/3d-models/bmw-m3-e30-6d67d12a2abe4e119842f65e46fa2f67"
            target="_blank"
            rel="noopener noreferrer"
            className="text-garage-200 hover:text-accent transition-colors underline-offset-2 hover:underline"
          >
            BMW M3 E30
          </a>{' '}
          by{' '}
          <a
            href="https://sketchfab.com/temp0.crazy"
            target="_blank"
            rel="noopener noreferrer"
            className="text-garage-200 hover:text-accent transition-colors underline-offset-2 hover:underline"
          >
            Artem P
          </a>
          , licensed under{' '}
          <a
            href="https://creativecommons.org/licenses/by/4.0/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-garage-200 hover:text-accent transition-colors underline-offset-2 hover:underline"
          >
            CC BY 4.0
          </a>
          . Photography from Pexels &amp; Unsplash.
        </div>
      </div>
    </footer>
  );
}
