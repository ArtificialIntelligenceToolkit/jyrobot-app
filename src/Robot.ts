import {Color, Matrix, Point, Picture, Canvas} from "./utils";
import {Hit} from "./Hit";
import {World} from "./World";

export class RangeSensor {
    /*
       A range sensor that reads "reading" when
       no obstacle has been detected. "reading" is
       a ratio of distance/max, and "distance" is
       the reading in CM.
    */
    public max: number = 20; // CM
    public reading: number = 1.0;
    public distance: number;
    public direction: number;
    public position: number;
    public p1: number[];

    constructor(position: number, direction: number) {
	this.position = position;
	this.direction = direction;
	this.distance = this.reading * this.max;
    }

    getDistance() {
	return this.distance;
    }

    getReading() {
	return this.reading;
    }

    setDistance(distance: number) {
	this.distance = distance;
	this.reading = distance/this.max;
    }

    setReading(reading: number) {
	this.reading = reading;
	this.distance = reading * this.max;
    }
}

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
    public ir_sensors: RangeSensor[];
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
	this.ir_sensors = [new RangeSensor(8.3, Math.PI/8), new RangeSensor(8.3, -Math.PI/8)];
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

    getIR(pos: number): number {
	// 0 is on right, front
	// 1 is on left, front
	return this.ir_sensors[pos].getReading();
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

    update(canvas: Canvas) {
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
	    if (tvx !== 0 && Math.random() < .01) {
		//this.direction += random(.1) - .05; // a bit of noise
	    }
	} else {
	    //this.direction += random(.2) - .1;
	}
	// update sensors, camera
	// on right:
	for (let index=0; index < this.ir_sensors.length; index++) {
	    let ir_sensor = this.ir_sensors[index];
	    let p: number[] = this.rotateAround(this.x, this.y, ir_sensor.position, this.direction + ir_sensor.direction);
	    ir_sensor.setReading(1.0);
	    // FIXME: width in radians
	    for (let incr = -0.5; incr <= 0.5; incr += 0.5) {
		let hit: Hit = this.castRay(
		    p[0], p[1], -this.direction + Math.PI/2.0  + incr,
		    ir_sensor.max);
		if (hit) {
		    if (this.debug) {
			canvas.fill(new Color(0, 255, 0));
			canvas.ellipse(p[0], p[1], 5, 5);
			canvas.ellipse(hit.x, hit.y, 5, 5);
		    }
		    if (hit.distance < ir_sensor.getDistance()) {
			ir_sensor.setDistance(hit.distance);
		    }
		}
	    }
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
	const body: number[][] = [ // CM
	    [4.17, 5.0], [4.17, 6.67], [5.83, 5.83], [5.83, 5.0], [7.5, 5.0], [7.5, -5.0], [5.83, -5.0],
	    [5.83, -5.83], [4.17, -6.67], [4.17, -5.0], [-4.17, -5.0], [-4.17, -6.67], [-5.83, -5.83],
	    [-6.67, -5.0], [-7.5, -4.17], [-7.5, 4.17], [-6.67, 5.0], [-5.83, 5.83], [-4.17, 6.67],
	    [-4.17, 5.0]
	];

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
	for (let i =0; i < body.length; i++) {
	    canvas.vertex(body[i][0], body[i][1]);
	}
	canvas.endShape();
	canvas.noStroke();
	// Draw wheels:
	canvas.fill(new Color(0));
	canvas.rect(-3.33, -7.67,
		    6.33, 1.67);
	canvas.rect(-3.33, 6.0,
		    6.33, 1.67);
	// hole:
	canvas.fill(new Color(0, 64, 0));
	canvas.strokeStyle(null, 0);
	canvas.ellipse(0, 0, 1.67, 1.67);
	// fluke
	canvas.fill(new Color(0, 64, 0));
	canvas.strokeStyle(null, 0);
	canvas.rect(5.0, -3.33, 1.33, 6.33);
	canvas.popMatrix();

	for (let index=0; index < this.ir_sensors.length; index++) {
	    if (this.getIR(index) < 1.0) {
		canvas.strokeStyle(new Color(255), 1);
	    } else {
		canvas.strokeStyle(new Color(0), 1);
	    }
	    canvas.fill(new Color(128, 0, 128, 64));
	    let p1 = this.rotateAround(this.x, this.y, this.ir_sensors[index].position, this.direction + this.ir_sensors[index].direction);
	    let dist = this.ir_sensors[index].getDistance();
	    canvas.arc(p1[0], p1[1], dist, dist,
		       this.direction - .5, this.direction + .5); // FIXME: width in radians
	}
    }
}
