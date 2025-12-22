
// Geometry Utilities for Chart Drawing Interaction

interface Point { x: number; y: number; }

export const distance = (p1: Point, p2: Point) => {
    return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
};

export const pointToLineDistance = (p: Point, v: Point, w: Point) => {
    const l2 = Math.pow(distance(v, w), 2);
    if (l2 === 0) return distance(p, v);
    let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
    t = Math.max(0, Math.min(1, t));
    const projection = { x: v.x + t * (w.x - v.x), y: v.y + t * (w.y - v.y) };
    return distance(p, projection);
};

export const isNearLine = (p: Point, start: Point, end: Point, threshold = 6) => {
    return pointToLineDistance(p, start, end) < threshold;
};

export const isNearPoint = (p: Point, target: Point, threshold = 8) => {
    return distance(p, target) < threshold;
};

export const isInRect = (p: Point, start: Point, end: Point) => {
    const minX = Math.min(start.x, end.x);
    const maxX = Math.max(start.x, end.x);
    const minY = Math.min(start.y, end.y);
    const maxY = Math.max(start.y, end.y);
    return p.x >= minX && p.x <= maxX && p.y >= minY && p.y <= maxY;
};

// Returns a point snapped to 45-degree increments relative to anchor
export const snapToAngle = (anchor: Point, current: Point): Point => {
    const dx = current.x - anchor.x;
    const dy = current.y - anchor.y;
    const angle = Math.atan2(dy, dx);
    const snapAngle = Math.round(angle / (Math.PI / 4)) * (Math.PI / 4);
    const dist = distance(anchor, current);
    return {
        x: anchor.x + Math.cos(snapAngle) * dist,
        y: anchor.y + Math.sin(snapAngle) * dist
    };
};
