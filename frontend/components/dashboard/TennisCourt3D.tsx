
import React, { Suspense, useState, useEffect } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, CatmullRomLine } from '@react-three/drei';
import * as THREE from 'three';
import Button from '../Button';
import { Eraser, MoveUp, MoveDown, Save, X, Trash2, Edit, User as UserIcon, Loader2 } from 'lucide-react';
import { User, Trajectory as TrajectoryType } from '../../types';
import { api } from '../../services/api';

// --- Типы и Константы ---

type Trajectory = TrajectoryType;

const COLORS = { WHITE: '#FFFFFF', YELLOW: '#FFEB3B', BLUE: '#2196F3' };
const ARC_HEIGHTS = { LOW: 1.5, HIGH: 4.0 };

const tennisBallCursor = `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='32' height='32' style='font-size:24px'><text x='0' y='24' fill='%23c8e639'>🎾</text></svg>") 16 16, auto`;
const canvasStyles: React.CSSProperties = { width: '100%', height: '100%', cursor: tennisBallCursor, touchAction: 'none' };

const COURT_LENGTH = 23.77;
const COURT_WIDTH = 10.97;
const NET_HEIGHT = 1.07;
const LINE_Y_OFFSET = 0.01;

// --- Хелперы ---

const calculateArcPoints = (flatPoints: THREE.Vector3[], arcHeight: number): THREE.Vector3[] => {
    if (flatPoints.length < 2) return [];
    // Ensure points are THREE.Vector3 instances before calling distanceTo
    const startPoint = new THREE.Vector3(flatPoints[0].x, flatPoints[0].y, flatPoints[0].z);
    const endPoint = new THREE.Vector3(flatPoints[flatPoints.length - 1].x, flatPoints[flatPoints.length - 1].y, flatPoints[flatPoints.length - 1].z);
    
    const totalDistance = endPoint.distanceTo(startPoint);
    const maxHeight = Math.min(arcHeight, totalDistance / 1.5);
    
    return flatPoints.map((p, i) => {
        const point = new THREE.Vector3(p.x, p.y, p.z);
        const progress = i / (flatPoints.length - 1);
        const y = 4 * maxHeight * progress * (1 - progress);
        return new THREE.Vector3(point.x, point.y + y, point.z);
    });
};

// --- Компоненты 3D Сцены ---

const CourtSurface = (props) => (
    <mesh {...props} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[COURT_WIDTH, COURT_LENGTH]} />
        <meshStandardMaterial color="#4a7f3b" />
    </mesh>
);

const CourtLines = () => {
    const SERVICE_BOX_LENGTH = 6.4;
    const SINGLE_COURT_WIDTH = 8.23;
    const halfLength = COURT_LENGTH / 2;
    const halfWidth = COURT_WIDTH / 2;
    const linePoints = [
        [new THREE.Vector3(-halfWidth, LINE_Y_OFFSET, -halfLength), new THREE.Vector3(-halfWidth, LINE_Y_OFFSET, halfLength)],
        [new THREE.Vector3(halfWidth, LINE_Y_OFFSET, -halfLength), new THREE.Vector3(halfWidth, LINE_Y_OFFSET, halfLength)],
        [new THREE.Vector3(-halfWidth, LINE_Y_OFFSET, -halfLength), new THREE.Vector3(halfWidth, LINE_Y_OFFSET, -halfLength)],
        [new THREE.Vector3(-halfWidth, LINE_Y_OFFSET, halfLength), new THREE.Vector3(halfWidth, LINE_Y_OFFSET, halfLength)],
        [new THREE.Vector3(-SINGLE_COURT_WIDTH/2, LINE_Y_OFFSET, -halfLength), new THREE.Vector3(-SINGLE_COURT_WIDTH/2, LINE_Y_OFFSET, halfLength)],
        [new THREE.Vector3(SINGLE_COURT_WIDTH/2, LINE_Y_OFFSET, -halfLength), new THREE.Vector3(SINGLE_COURT_WIDTH/2, LINE_Y_OFFSET, halfLength)],
        [new THREE.Vector3(-SINGLE_COURT_WIDTH/2, LINE_Y_OFFSET, -SERVICE_BOX_LENGTH), new THREE.Vector3(SINGLE_COURT_WIDTH/2, LINE_Y_OFFSET, -SERVICE_BOX_LENGTH)],
        [new THREE.Vector3(-SINGLE_COURT_WIDTH/2, LINE_Y_OFFSET, SERVICE_BOX_LENGTH), new THREE.Vector3(SINGLE_COURT_WIDTH/2, LINE_Y_OFFSET, SERVICE_BOX_LENGTH)],
        [new THREE.Vector3(0, LINE_Y_OFFSET, -SERVICE_BOX_LENGTH), new THREE.Vector3(0, LINE_Y_OFFSET, SERVICE_BOX_LENGTH)],
    ];
    return <group>{linePoints.map((p, i) => <CatmullRomLine key={i} points={p} color="white" lineWidth={2} />)}</group>;
};

const Net = () => (
    <mesh position={[0, NET_HEIGHT / 2, 0]}>
        <planeGeometry args={[COURT_WIDTH, NET_HEIGHT]} />
        <meshStandardMaterial color="#222" side={THREE.DoubleSide} transparent opacity={0.5} />
    </mesh>
);

// --- Логика Сцены и Рисования ---

const Scene = ({ trajectories, setTrajectories, activeColor, activeArcHeight }) => {
    const [currentDrawing, setCurrentDrawing] = useState<any>(null);
    const [isOrbitEnabled, setIsOrbitEnabled] = useState(true);
    const { camera, raycaster, scene, pointer } = useThree();

    const getIntersectionPoint = (): THREE.Vector3 | null => {
        raycaster.setFromCamera(pointer, camera);
        const courtPlane = scene.getObjectByName('court-surface-interactive');
        if (!courtPlane) return null;
        const intersects = raycaster.intersectObject(courtPlane);
        return intersects.length > 0 ? intersects[0].point.setY(LINE_Y_OFFSET) : null;
    };
    
    const handlePointerDown = (e: React.PointerEvent<THREE.Object3D>) => {
        if (e.button !== 0) return;
        e.stopPropagation();
        setIsOrbitEnabled(false);
        const point = getIntersectionPoint();
        if (point) {
            setCurrentDrawing({ id: `td-${Date.now()}`, points: [point], color: activeColor, arcHeight: activeArcHeight });
        }
    };
    
    const handlePointerMove = (e: React.PointerEvent<THREE.Object3D>) => {
        if (!currentDrawing) return;
        e.stopPropagation();
        const point = getIntersectionPoint();
        if (point && (currentDrawing.points.length === 0 || point.distanceTo(currentDrawing.points[currentDrawing.points.length - 1]) > 0.1)) {
            setCurrentDrawing(prev => prev ? { ...prev, points: [...prev.points, point] } : null);
        }
    };

    const handlePointerUp = () => {
        setIsOrbitEnabled(true);
        if (currentDrawing && currentDrawing.points.length > 1) {
            setTrajectories(prev => [...prev, currentDrawing]);
        }
        setCurrentDrawing(null);
    };

    const trajectoriesToRender = currentDrawing ? [...trajectories, currentDrawing] : trajectories;

    return (
        <>
            <ambientLight intensity={1.5} />
            <directionalLight position={[10, 20, 5]} intensity={1} castShadow />
            <CourtSurface name="court-surface-interactive" onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} />
            <CourtLines />
            <Net />
            
            {trajectoriesToRender.map(traj => (
                traj.points.length > 1 && <CatmullRomLine key={traj.id} points={calculateArcPoints(traj.points, traj.arcHeight)} color={traj.color} lineWidth={12} dashed dashScale={20} gapSize={10} />
            ))}

            <OrbitControls enabled={isOrbitEnabled} maxPolarAngle={Math.PI / 2.1} minDistance={10} maxDistance={40}/>
        </>
    );
};

// --- UI Компоненты ---

const ControlsWrapper = ({ children }) => <div className="absolute bottom-4 left-4 z-10 flex items-end gap-3">{children}</div>;

const ColorPicker = ({ activeColor, setActiveColor, disabled }) => (
    <div className={`bg-white/80 backdrop-blur-sm p-2 rounded-xl flex gap-2 shadow-lg border border-slate-200 ${disabled ? 'opacity-50' : ''}`}>
         {Object.values(COLORS).map((color) => (
             <button key={color} onClick={() => setActiveColor(color)} disabled={disabled} className={`w-8 h-8 rounded-lg transition-all transform hover:scale-110 ${activeColor === color ? 'ring-2 ring-offset-2 ring-slate-900' : 'ring-1 ring-slate-300'}`} style={{ backgroundColor: color }} />
         ))}
    </div>
);

const ArcPicker = ({ activeHeight, setArcHeight, disabled }) => (
    <div className={`bg-white/80 backdrop-blur-sm p-2 rounded-xl flex gap-2 shadow-lg border border-slate-200 ${disabled ? 'opacity-50' : ''}`}>
        {Object.entries(ARC_HEIGHTS).map(([name, height]) => (
            <button key={name} onClick={() => setArcHeight(height)} disabled={disabled} title={name === 'LOW' ? 'Низкий удар' : 'Высокий удар'} className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all ${activeHeight === height ? 'bg-slate-900 text-white' : 'bg-white text-slate-500 hover:bg-slate-100'}`}>
                {name === 'LOW' ? <MoveDown size={20} /> : <MoveUp size={20} />}
            </button>
        ))}
    </div>
);

interface TennisCourt3DProps {
  user: User;
  trajectories: Trajectory[];
  setTrajectories: React.Dispatch<React.SetStateAction<Trajectory[]>>;
}


// --- Основной Компонент ---

const TennisCourt3D = ({ user, trajectories, setTrajectories }: TennisCourt3DProps) => {
    const [activeColor, setActiveColor] = useState<string>(COLORS.WHITE);
    const [activeArcHeight, setActiveArcHeight] = useState<number>(ARC_HEIGHTS.LOW);
    
    return (
        <div className="w-full h-full bg-slate-100 rounded-3xl overflow-hidden relative">
            <Suspense fallback={<div className="w-full h-full flex items-center justify-center text-slate-500">Загрузка...</div>}>
                <Canvas style={canvasStyles} camera={{ position: [0, 15, 20], fov: 50 }} shadows>
                    <Scene trajectories={trajectories} setTrajectories={setTrajectories} activeColor={activeColor} activeArcHeight={activeArcHeight} />
                </Canvas>
            </Suspense>
            <ControlsWrapper>
                <ColorPicker activeColor={activeColor} setActiveColor={setActiveColor} disabled={false} />
                <ArcPicker activeHeight={activeArcHeight} setArcHeight={setActiveArcHeight} disabled={false} />
            </ControlsWrapper>
            <Button variant="secondary" size="sm" className="absolute bottom-4 right-4 z-10" onClick={() => setTrajectories([])} disabled={trajectories.length === 0}>
                <Eraser size={16} className="mr-2"/>
                Очистить
            </Button>
        </div>
    );
};

export default TennisCourt3D;