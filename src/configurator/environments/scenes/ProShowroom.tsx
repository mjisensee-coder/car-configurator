import { MeshReflectorMaterial, ContactShadows } from '@react-three/drei';
import { RoomShell } from './shared';
import { HDR_FILES } from '../assets';
import { BakedEnvironment } from '../BakedEnvironment';
import { useFloorMask } from '../floorMask';
import { useRenderer } from '../../renderer/RendererContext';

/**
 * Pro Showroom — the default environment.
 *
 * Sleek automotive showroom built from primitives:
 *   - Polished concrete floor with high-quality real-time reflections.
 *   - 30×20×8m rectangular room with charcoal walls.
 *   - 4 long horizontal ceiling strips — the SIGNATURE element that paints
 *     horizontal highlights onto the car body the way a real car-show
 *     floor does.
 *   - Bright dealer-floor lighting overall (not moody/dramatic).
 *
 * Lighting comes from a baked HDR environment map rather than live
 * Lightformers: scripts/generate-hdri.mjs ray-traces this same room into
 * public/hdr/studio.hdr, so the body picks the strips up as
 * mirror-quality reflections without the renderer re-rendering a cubemap
 * probe every frame. The visible ceiling-strip geometry below is a
 * separate, matching set of emissive boxes so the camera sees the same
 * lights overhead.
 *
 * Lighting intent: BRIGHTLY-LIT dealer showroom floor. If you find
 * yourself wanting more shadow / mood, that's the Night Display
 * environment — keep this one bright.
 */

const ROOM_W = 30;
const ROOM_D = 20;
const ROOM_H = 8;
const STRIP_Z = [-4.5, -1.5, 1.5, 4.5];

export function ProShowroom() {
  const { backend } = useRenderer();

  return (
    <>
      <color attach="background" args={['#161620']} />

      {/* IBL: a baked equirectangular map of this exact room
          (scripts/generate-hdri.mjs traces the same 30×20×8 m box and the
          same four ceiling strips). It replaced a <Environment
          frames={Infinity}> probe that re-rendered a cubemap every frame —
          the strips are static, so there was nothing to re-render. */}
      <BakedEnvironment file={HDR_FILES.showroom} />

      {/* Visible ceiling strips — these match the strips baked into
          public/hdr/studio.hdr, so reflection and geometry agree. */}
      <group>
        {STRIP_Z.map((z, i) => (
          <mesh key={i} position={[0, ROOM_H - 0.06, z]}>
            <boxGeometry args={[10, 0.08, 0.3]} />
            <meshStandardMaterial
              color="#ffffff"
              emissive="#ffffff"
              emissiveIntensity={5}
              toneMapped={false}
            />
          </mesh>
        ))}
      </group>

      {/* Walls + ceiling — slightly lighter charcoal so they reflect more
          of the bright lighting instead of crushing to black. */}
      <RoomShell
        width={ROOM_W}
        depth={ROOM_D}
        height={ROOM_H}
        wallColor="#23232a"
        ceilingColor="#1c1c22"
      />

      {backend === 'webgpu' ? <PlainFloor /> : <ReflectiveFloor />}

      {/* Tight contact shadow under the car */}
      <ContactShadows
        position={[0, 0.01, 0]}
        opacity={0.5}
        scale={14}
        blur={2.4}
        far={3}
        color="#000000"
      />

      {/* Brighter ambient so the dealer-floor feel comes through */}
      <ambientLight intensity={0.4} />

      {/* Key spotlight from above-front for crisp specular highlights */}
      <spotLight
        position={[0, 7, 5]}
        target-position={[0, 0.6, 0]}
        angle={0.6}
        penumbra={0.7}
        intensity={4.5}
        color="#ffffff"
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0001}
      />
      {/* Fill spot from the opposite-front side so the body sides both
          get a bright wash — eliminates the side-on shadow drop-off. */}
      <spotLight
        position={[0, 7, -5]}
        target-position={[0, 0.6, 0]}
        angle={0.6}
        penumbra={0.8}
        intensity={3.0}
        color="#ffffff"
      />
      {/* Two side wash spots from each lateral direction */}
      <spotLight
        position={[7, 5, 0]}
        target-position={[0, 0.6, 0]}
        angle={0.7}
        penumbra={0.85}
        intensity={2.0}
        color="#ffffff"
      />
      <spotLight
        position={[-7, 5, 0]}
        target-position={[0, 0.6, 0]}
        angle={0.7}
        penumbra={0.85}
        intensity={2.0}
        color="#ffffff"
      />
    </>
  );
}

/**
 * WebGL floor: a real-time mirror, masked at the edges so the plane reads
 * as an endless studio floor instead of a rectangle with visible corners.
 */
function ReflectiveFloor() {
  const floorMask = useFloorMask();
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
      <planeGeometry args={[ROOM_W * 1.2, ROOM_D * 1.2]} />
      <MeshReflectorMaterial
        // Generated radial mask — fades the mirror out toward the room
        // edges so the plane reads as an endless floor.
        alphaMap={floorMask}
        transparent
        mirror={0.75}
        blur={[400, 100]}
        resolution={1024}
        mixBlur={1}
        mixStrength={0.6}
        roughness={0.4}
        depthScale={1.2}
        minDepthThreshold={0.85}
        maxDepthThreshold={1}
        color="#101015"
        metalness={0.5}
      />
    </mesh>
  );
}

/**
 * WebGPU floor: a plain metallic material, and deliberately no KTX2 mask.
 *
 * Two things in the WebGL floor cannot cross to the node-material
 * pipeline. MeshReflectorMaterial patches GLSL through onBeforeCompile,
 * which node materials never see. And drei's useKTX2 calls
 * `detectSupport(gl)` on three-stdlib's KTX2Loader, which reads WebGL
 * extensions off the renderer — handed a WebGPURenderer it throws
 * ("Cannot read properties of undefined"), taking the whole scene down
 * with it. Splitting the floor into two components is what keeps that
 * hook from running at all under WebGPU; a conditional inside one
 * component would still call it.
 */
function PlainFloor() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
      <planeGeometry args={[ROOM_W * 1.2, ROOM_D * 1.2]} />
      <meshStandardMaterial color="#101015" metalness={0.85} roughness={0.18} />
    </mesh>
  );
}
