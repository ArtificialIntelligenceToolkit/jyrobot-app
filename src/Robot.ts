import {Color, Matrix, Point, Picture, Canvas} from "./utils";
import {Hit} from "./Hit";
import {World} from "./World";

export class Robot {
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
    public ir_sensors: Hit[];
    public max_ir: number;
    public camera: Hit[];
    public cam: boolean;
    public cameraShape: number[];

    initialize() {
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
	this.color = new Color(255, 0, 0);
	this.ir_sensors = [null, null];
	this.max_ir = 50;
	this.cameraShape = [256, 128];
	this.camera = new Array(this.cameraShape[0]);
	this.cam = false;
    }

    constructor(x: number, y: number, direction: number) {
	this.initialize();
	this.x = x;
	this.y = y;
	this.direction = direction;
	this.state = "";
	this.time = 0;
    }

    forward(vx: number) {
	this.vx = vx;
    }

    backward(vx: number) {
	this.vx = -vx;
    }

    format(v: number): number {
	return parseFloat(v.toFixed(2));
    }

    getIR(pos: number): number {
	// 0 is on right, front
	// 1 is on left, front
	if (this.ir_sensors[pos] !== null) {
	    return this.format(this.ir_sensors[pos].distance/(this.max_ir/250.0 * this.world.scale));
	} else {
	    return 1.0;
	}
    }

    takePicture(): Picture {
	const pic: Picture = new Picture(this.cameraShape[0], this.cameraShape[1]);
	const size: number = Math.max(this.world.w, this.world.h);
	for (let i=0; i < this.cameraShape[0]; i++) {
	    const hit: Hit = this.camera[i];
	    let high: number;
	    let hcolor: Color = null;
	    if (hit) {
		const s: number = Math.max(Math.min(1.0 - hit.distance/size, 1.0), 0.0);
		const r: number = hit.color.red;
		const g: number = hit.color.green;
		const b: number = hit.color.blue;
		hcolor = new Color(r * s, g * s, b * s);
		high = (1.0 - s) * 128;
		//pg.line(i, 0 + high/2, i, 128 - high/2);
	    } else {
		high = 0;
	    }
	    for (let j = 0; j < this.cameraShape[1]; j++) {
		if (j < high/2) { //256 - high/2.0) { // sky
		    pic.set(i, j, new Color(0, 0, 128));
		} else if (j < this.cameraShape[1] - high/2) { //256 - high && hcolor != null) { // hit
		    if (hcolor !== null)
			pic.set(i, j, hcolor);
		} else { // ground
		    pic.set(i, j, new Color(0, 128, 0));
		}
	    }
	}
	return pic;
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
	let col: Color = null;
	let dist: number = null;

	let count: number = 0;
	for (let wall of this.world.walls) {
	    for (let i=0; i < wall.length; i += 2) {
		const p1: Point = wall[i];
		const p2: Point = wall[i+1];
		let pos: number[] = this.intersect_hit(x1, y1, x2, y2,
						       p1.x, p1.y, p2.x, p2.y);
		if (pos !== null) {
		    col = this.world.colors[count];
		    dist = this.distance(pos[0], pos[1], x1, y1);
		    hits.push(new Hit(pos[0], pos[1], dist, col, x1, y1));
		}
	    }
	    count++;
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

    update(canvas: Canvas) {
	const scale: number = this.world.scale;
	//this.direction += PI/180;
	const tvx: number = this.vx * Math.sin(-this.direction + Math.PI/2) + this.vy * Math.cos(-this.direction + Math.PI/2);
	const tvy: number = this.vx * Math.cos(-this.direction + Math.PI/2) - this.vy * Math.sin(-this.direction + Math.PI/2);
	// proposed positions:
	const px: number = this.x + tvx/250.0 * scale;
	const py: number = this.y + tvy/250.0 * scale;
	const pdirection: number = this.direction - this.va;
	// check to see if collision
	// bounding box:
	const p1: number[] = this.rotateAround(px, py, 30/250.0 * scale, pdirection + Math.PI/4 + 0 * Math.PI/2);
	const p2: number[] = this.rotateAround(px, py, 30/250.0 * scale, pdirection + Math.PI/4 + 1 * Math.PI/2);
	const p3: number[] = this.rotateAround(px, py, 30/250.0 * scale, pdirection + Math.PI/4 + 2 * Math.PI/2);
	const p4: number[] = this.rotateAround(px, py, 30/250.0 * scale, pdirection + Math.PI/4 + 3 * Math.PI/2);
	this.bounding_box[0] = p1;
	this.bounding_box[1] = p2;
	this.bounding_box[2] = p3;
	this.bounding_box[3] = p4;
	this.stalled = false;
	// if intersection, can't move:
	for (let wall of this.world.walls) {
	    for (let i=0; i < wall.length; i += 2) {
		const w1: Point = wall[i];
		const w2: Point = wall[i+1];
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
	    if (tvx !== 0 && Math.random() < .01) {
		//this.direction += random(.1) - .05; // a bit of noise
	    }
	} else {
	    //this.direction += random(.2) - .1;
	}
	// update sensors, camera
	// on right:
	let p: number[] = this.rotateAround(this.x, this.y, 25/250.0 * scale, this.direction + Math.PI/8);
	let hit: Hit = this.castRay(p[0], p[1], -this.direction + Math.PI/2.0, this.max_ir/250.0 * scale);
	if (hit) {
	    if (this.debug) {
		canvas.fill(new Color(0, 255, 0));
		canvas.ellipse(p[0], p[1], 5, 5);
		canvas.ellipse(hit.x, hit.y, 5, 5);
	    }
	    this.ir_sensors[0] = hit;
	} else {
	    this.ir_sensors[0] = null;
	}

	p = this.rotateAround(this.x, this.y, 25/250.0 * scale, this.direction - Math.PI/8);
	hit = this.castRay(p[0], p[1], -this.direction + Math.PI/2, this.max_ir/250.0 * scale);
	if (hit) {
	    if (this.debug) {
		canvas.fill(new Color(0, 0, 255));
		canvas.ellipse(p[0], p[1], 5, 5);
		canvas.ellipse(hit.x, hit.y, 5, 5);
	    }
	    this.ir_sensors[1] = hit;
	} else {
	    this.ir_sensors[1] = null;
	}

	// camera:
	if (true) {
	    for (let i=0; i<this.cameraShape[0]; i++) {
		const angle: number = i/this.cameraShape[0] * 60 - 30;
		this.camera[i] = this.castRay(this.x, this.y, -this.direction + Math.PI/2.0 - angle*Math.PI/180.0, 1000);
	    }
	}
    }

    rotateAround(x1: number, y1: number, length: number, angle: number): number[] {
	return [
	    x1 + length * Math.cos(-angle),
	    y1 - length * Math.sin(-angle)
	];
    }

    draw(canvas: Canvas) {
	const scale: number = this.world.scale;
	const sx: number[] = [
	    0.05, 0.05, 0.07, 0.07, 0.09, 0.09, 0.07,
	    0.07, 0.05, 0.05, -0.05, -0.05, -0.07,
	    -0.08, -0.09, -0.09, -0.08, -0.07, -0.05,
	    -0.05
	];
	const sy: number[] = [
	    0.06, 0.08, 0.07, 0.06, 0.06, -0.06, -0.06,
	    -0.07, -0.08, -0.06, -0.06, -0.08, -0.07,
	    -0.06, -0.05, 0.05, 0.06, 0.07, 0.08, 0.06
	];
	if (this.debug) {
	    canvas.stroke(new Color(255));
	    // bounding box:
	    const p1: number[] = this.rotateAround(this.x, this.y, 30/250.0 * scale, this.direction + Math.PI/4.0 + 0 * Math.PI/2.0);
	    const p2: number[] = this.rotateAround(this.x, this.y, 30/250.0 * scale, this.direction + Math.PI/4.0 + 1 * Math.PI/2.0);
	    const p3: number[] = this.rotateAround(this.x, this.y, 30/250.0 * scale, this.direction + Math.PI/4.0 + 2 * Math.PI/2.0);
	    const p4: number[] = this.rotateAround(this.x, this.y, 30/250.0 * scale, this.direction + Math.PI/4.0 + 3 * Math.PI/2.0);
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
	    canvas.stroke(new Color(255));
	} else {
	    canvas.fill(this.color);
	    canvas.noStroke();
	}
	canvas.beginShape();
	for (let i =0; i < sx.length; i++) {
	    canvas.vertex(sx[i] * scale, sy[i] * scale);
	}
	canvas.endShape();
	canvas.noStroke();
	// Draw wheels:
	canvas.fill(new Color(0));
	canvas.rect(-10/250.0 * scale, -23/250.0 * scale, 19/250.0 * scale, 5/250.0 * scale);
	canvas.rect(-10/250.0 * scale, 18/250.0 * scale, 19/250.0 * scale, 5/250.0 * scale);
	// hole:
	canvas.fill(new Color(0, 64, 0));
	canvas.ellipse(0, 0, 5/250.0 * scale, 5/250.0 * scale);
	// fluke
	canvas.fill(new Color(0, 64, 0));
	canvas.rect(15/250.0 * scale, -10/250.0 * scale, 4/250.0 * scale, 19/250.0 * scale);
	canvas.popMatrix();
	// draw sensors
	// right front IR
	// position of start of sensor:
	let p1: number[] = this.rotateAround(this.x, this.y, 25/250.0 * scale, this.direction + Math.PI/8);
	// angle of sensor:
	let p2: number[] = this.rotateAround(p1[0], p1[1], this.getIR(0) * this.max_ir/250.0 * scale, this.direction);
	let dist: number = this.distance(p1[0], p1[1], p2[0], p2[1]);
	if (this.getIR(0) < 1.0) {
	    canvas.stroke(new Color(255));
	} else {
            canvas.stroke(new Color(0));
	}
	canvas.fill(new Color(128, 0, 128, 64));
	canvas.arc(p1[0], p1[1], dist, dist,
		   this.direction - .5, this.direction + .5);

	// left front IR
	p1 = this.rotateAround(this.x, this.y, 25/250.0 * scale, this.direction - Math.PI/8);
	p2 = this.rotateAround(p1[0], p1[1], this.getIR(1) * this.max_ir/250.0 * scale, this.direction);
	dist = this.distance(p1[0], p1[1], p2[0], p2[1]);
	if (this.getIR(1) < 1.0) {
	    canvas.stroke(new Color(255));
	} else {
            canvas.stroke(new Color(0));
	}
	canvas.fill(new Color(128, 0, 128, 64));
	canvas.arc(p1[0], p1[1], dist, dist,
		   this.direction - .5, this.direction + .5);
    }
}
