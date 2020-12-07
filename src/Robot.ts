import {Color, Matrix, Point, Picture, Canvas} from "./utils";
import {Hit} from "./Hit";
import {World} from "./World";
import {Camera, RangeSensor} from "./sensors";

export class Robot {
    public name: string;
    public x: number;
    public y: number;
    public direction: number;
    public debug: boolean;
    public vx: number; // velocity in x direction
    public vy: number; // velocity in y direction
    public va: number; // turn velocity
    public world: World;
    // sensors
    public stalled: boolean;
    public state: string;
    public time: number;
    public bounding_box: Matrix;
    public color: Color;
    public range_sensors: RangeSensor[];
    public cameras: Camera[];
    public trace: Point[];
    public doTrace: boolean;
    public max_trace_length: number;
    public body: number[][];

    initialize() {
	this.doTrace = true;
	this.trace = [];
	this.max_trace_length = 1000;
	this.x = 0;
	this.y = 0;
	this.direction = 0;
	this.state = "";
	this.time = 0;
	this.debug = false;
	this.vx = 0.0; // velocity in x direction
	this.vy = 0.0; // velocity in y direction
	this.va = 0.0; // turn velocity
	this.stalled = false;
	this.state = "";
	this.time = 0;
	this.bounding_box = new Matrix(4, 2);
	this.range_sensors = [];
	this.cameras = [];
	this.state = "";
	this.time = 0;
    }

    constructor(config: any) {
	this.initialize();
	this.name = config.name;
	this.x = config.x;
	this.y = config.y;
	this.direction = config.direction;
	this.color = new Color(config.color[0], config.color[1], config.color[2]) ;
	this.body = config.body;
	for (let cameraConfig of config.cameras) {
	    let camera = new Camera(this);
	    this.cameras.push(camera);
	}
	for (let rangeConfig of config.rangeSensors) {
	    let sensor = new RangeSensor(this, rangeConfig.position, rangeConfig.direction, rangeConfig.max, rangeConfig.width);
	    this.range_sensors.push(sensor);
	}
    }

    forward(vx: number) {
	this.vx = vx;
    }

    backward(vx: number) {
	this.vx = -vx;
    }

    turn(va: number) {
	this.va = va;
    }

    stop() {
	this.vx = 0.0;
	this.vy = 0.0;
	this.va = 0.0;
    }

    ccw(ax: number, ay: number, bx: number, by: number,  cx: number, cy: number): boolean {
	// counter clockwise
	return (((cy - ay) * (bx - ax)) > ((by - ay) * (cx - ax)));
    }

    intersect(ax: number, ay: number, bx: number, by: number, cx: number, cy: number, dx: number, dy: number): boolean {
	// Return true if line segments AB and CD intersect
	return (this.ccw(ax, ay, cx, cy, dx, dy) !== this.ccw(bx, by, cx, cy, dx, dy) &&
		this.ccw(ax, ay, bx, by, cx, cy) !== this.ccw(ax, ay, bx, by, dx, dy));
    }

    coefs(p1x: number, p1y: number, p2x: number, p2y: number): number[] {
	const A: number = (p1y - p2y);
	const B: number = (p2x - p1x);
	const C: number = (p1x * p2y - p2x * p1y);
	return [
	    A, B, -C
	];
    }

    intersect_coefs(L1_0: number, L1_1: number, L1_2: number,
		    L2_0: number, L2_1: number, L2_2: number): number[] {
	const D: number  = L1_0 * L2_1 - L1_1 * L2_0;
	if (D !== 0) {
	    const Dx: number = L1_2 * L2_1 - L1_1 * L2_2;
	    const Dy: number = L1_0 * L2_2 - L1_2 * L2_0;
	    const x1: number = Dx / D;
	    const y1: number = Dy / D;
	    return [
		x1, y1
	    ];
	} else {
	    return null;
	}
    }

    intersect_hit(p1x: number, p1y: number, p2x: number, p2y: number,
		  p3x: number, p3y: number, p4x: number, p4y: number): number[] {
	// http://stackoverflow.com/questions/20677795/find-the-point-of-intersecting-lines
	const L1: number[] = this.coefs(p1x, p1y, p2x, p2y);
	const L2: number[] = this.coefs(p3x, p3y, p4x, p4y);
	const xy: number[] = this.intersect_coefs(L1[0], L1[1], L1[2],
						  L2[0], L2[1], L2[2]);
	// now check to see on both segments:
	if (xy) {
	    let lowx: number = Math.min(p1x, p2x) - .1;
	    let highx: number = Math.max(p1x, p2x) + .1;
	    let lowy: number = Math.min(p1y, p2y) - .1;
	    let highy: number = Math.max(p1y, p2y) + .1;
	    if (lowx <= xy[0] && xy[0] <= highx &&
		lowy <= xy[1] && xy[1] <= highy) {
		lowx = Math.min(p3x, p4x) - .1;
		highx = Math.max(p3x, p4x) + .1;
		lowy = Math.min(p3y, p4y) - .1;
		highy = Math.max(p3y, p4y) + .1;
		if (lowx <= xy[0] && xy[0] <= highx &&
		    lowy <= xy[1] && xy[1] <= highy) {
		    return xy;
		}
	    }
	}
	return null;
    }

    distance(x1: number, y1: number, x2: number, y2: number): number {
	return Math.sqrt((x1 - x2) * (x1 - x2) + (y1 - y2) * (y1 - y2));
    }

    castRay(x1: number, y1: number, a: number, maxRange: number): Hit {
	const hits: Hit[] = [];
	const x2: number = Math.sin(a) * maxRange + x1;
	const y2: number = Math.cos(a) * maxRange + y1;
	let dist: number = null;

	for (let wall of this.world.walls) {
	    for (let line of wall.lines) {
		const p1: Point = line.p1;
		const p2: Point = line.p2;
		let pos: number[] = this.intersect_hit(x1, y1, x2, y2,
						       p1.x, p1.y, p2.x, p2.y);
		if (pos !== null) {
		    dist = this.distance(pos[0], pos[1], x1, y1);
		    hits.push(new Hit(pos[0], pos[1], dist, wall.color, x1, y1));
		}
	    }
	}
	if (hits.length === 0) {
	    return null;
	} else {
	    return this.min_hit(hits);
	}
    }

    min_hit(hits: Hit[]): Hit {
	// requires at least one Hit
	let minimum: Hit = hits[0];
	for (let hit of hits) {
	    if (hit.distance < minimum.distance) {
		minimum = hit;
	    }
	}
	return minimum;
    }

    update(canvas: Canvas, time: number) {
	this.time = time;
	if (this.doTrace) {
	    this.trace.push(new Point(this.x, this.y));
	    if (this.trace.length > this.max_trace_length) {
		this.trace.shift();
	    }
	    canvas.strokeStyle(new Color(200, 200, 200), 1);
	    canvas.beginShape();
	    for (let point of this.trace) {
		canvas.vertex(point.x, point.y);
	    }
	    canvas.stroke();
	}
	//this.direction += PI/180;
	const tvx: number = this.vx * Math.sin(-this.direction + Math.PI/2) + this.vy * Math.cos(-this.direction + Math.PI/2);
	const tvy: number = this.vx * Math.cos(-this.direction + Math.PI/2) - this.vy * Math.sin(-this.direction + Math.PI/2);
	// proposed positions:
	const px: number = this.x + tvx;
	const py: number = this.y + tvy;
	const pdirection: number = this.direction - this.va;
	// check to see if collision
	// bounding box:
	const p1: number[] = this.rotateAround(px, py, 10, pdirection + Math.PI/4 + 0 * Math.PI/2);
	const p2: number[] = this.rotateAround(px, py, 10, pdirection + Math.PI/4 + 1 * Math.PI/2);
	const p3: number[] = this.rotateAround(px, py, 10, pdirection + Math.PI/4 + 2 * Math.PI/2);
	const p4: number[] = this.rotateAround(px, py, 10, pdirection + Math.PI/4 + 3 * Math.PI/2);
	this.bounding_box[0] = p1;
	this.bounding_box[1] = p2;
	this.bounding_box[2] = p3;
	this.bounding_box[3] = p4;
	this.stalled = false;
	// if intersection, can't move:
	for (let wall of this.world.walls) {
	    for (let line of wall.lines) {
		const w1: Point = line.p1;
		const w2: Point = line.p2;
		if (this.intersect(p1[0], p1[1], p2[0], p2[1],
				   w1.x, w1.y, w2.x, w2.y) ||
		    this.intersect(p2[0], p2[1], p3[0], p3[1],
				   w1.x, w1.y, w2.x, w2.y) ||
		    this.intersect(p3[0], p3[1], p4[0], p4[1],
				   w1.x, w1.y, w2.x, w2.y) ||
		    this.intersect(p4[0], p4[1], p1[0], p1[1],
				   w1.x, w1.y, w2.x, w2.y)) {
		    this.stalled = true;
		    break;
		}
	    }
	}
	if (! this.stalled) {
	    // if no intersection, make move
	    this.x = px;
	    this.y = py;
	    this.direction = pdirection;
	}
	// Range Sensors:
	for (let range_sensor of this.range_sensors) {
	    range_sensor.update(canvas);
	}
	// Cameras:
	for (let camera of this.cameras) {
	    camera.update(canvas);
	}
    }

    rotateAround(x1: number, y1: number, length: number, angle: number): number[] {
	return [
	    x1 + length * Math.cos(-angle),
	    y1 - length * Math.sin(-angle)
	];
    }

    draw(canvas: Canvas) {
	if (this.debug) {
	    canvas.strokeStyle(new Color(255), 1);
	    // bounding box:
	    const p1: number[] = this.rotateAround(this.x, this.y, 10, this.direction + Math.PI/4.0 + 0 * Math.PI/2.0);
	    const p2: number[] = this.rotateAround(this.x, this.y, 10, this.direction + Math.PI/4.0 + 1 * Math.PI/2.0);
	    const p3: number[] = this.rotateAround(this.x, this.y, 10, this.direction + Math.PI/4.0 + 2 * Math.PI/2.0);
	    const p4: number[] = this.rotateAround(this.x, this.y, 10, this.direction + Math.PI/4.0 + 3 * Math.PI/2.0);
	    canvas.line(p1[0], p1[1], p2[0], p2[1]);
	    canvas.line(p2[0], p2[1], p3[0], p3[1]);
	    canvas.line(p3[0], p3[1], p4[0], p4[1]);
	    canvas.line(p4[0], p4[1], p1[0], p1[1]);
	}
	canvas.pushMatrix();
	canvas.translate(this.x, this.y);
	canvas.rotate(this.direction);

	// body:
	if (this.stalled) {
	    canvas.fill(new Color(128, 128, 128));
	    canvas.strokeStyle(new Color(255), 1);
	} else {
	    canvas.fill(this.color);
	    canvas.noStroke();
	}
	canvas.beginShape();
	for (let i =0; i < this.body.length; i++) {
	    canvas.vertex(this.body[i][0], this.body[i][1]);
	}
	canvas.endShape();
	canvas.noStroke();
	// Draw wheels:
	canvas.fill(new Color(0));
	canvas.rect(-3.33, -7.67, 6.33, 1.67);
	canvas.rect(-3.33, 6.0, 6.33, 1.67);
	// hole:
	canvas.fill(new Color(0, 64, 0));
	canvas.strokeStyle(null, 0);
	canvas.ellipse(0, 0, 1.67, 1.67);

	for (let camera of this.cameras) {
	    camera.draw(canvas);
	}
	canvas.popMatrix();

	for (let range_sensor of this.range_sensors) {
	    range_sensor.draw(canvas);
	}
    }
}
