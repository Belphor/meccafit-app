import {
  emberParticles,
  modeAtmosphere,
  type EmberParticleStyle,
  type PortalTone,
} from "@/lib/portal-theme";

type PortalEmberCurtainProps = {
  tone: PortalTone;
};

export function PortalEmberCurtain({ tone }: PortalEmberCurtainProps) {
  const atmosphere = modeAtmosphere[tone];

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {emberParticles.map((particle, index) => {
        const style: EmberParticleStyle = {
          left: particle.left,
          animationDelay: particle.delay,
          "--duration": particle.duration,
          "--drift": particle.drift,
        };

        return (
          <span
            key={particle.id}
            className={`absolute bottom-[-2rem] ${particle.size} ${particle.opacity} ${
              index % 2 === 0 ? atmosphere.particlePrimary : atmosphere.particleSecondary
            } animate-[ember-rise_var(--duration)_linear_infinite] rounded-[2px] blur-[0.2px] will-change-transform`}
            style={style}
          />
        );
      })}
    </div>
  );
}
