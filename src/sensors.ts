import {Color, Picture, Canvas} from "./utils";
import {Hit} from "./Hit";
import {Robot} from './Robot';

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
    public width: number; // radians
    public p1: number[];
    public time: number = 0;

    constructor(position: number, direction: number, max: number, width: number) {
	this.position = position;
	this.direction = direction;
	this.max = max;
	this.width = width;
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

export class Camera {
    public cameraShape: number[];
    public camera: Hit[];
    public robot: Robot;

    constructor(robot: Robot) {
	this.robot = robot;
	this.cameraShape = [256, 128];
	this.camera = new Array(this.cameraShape[0]);
    }

    update() {
	for (let i=0; i<this.cameraShape[0]; i++) {
	    const angle: number = i/this.cameraShape[0] * 60 - 30;
	    this.camera[i] = this.robot.castRay(
		this.robot.x, this.robot.y,
		Math.PI/2 -this.robot.direction - angle*Math.PI/180.0, 1000);
	}
    }

    draw(canvas: Canvas) {
	canvas.fill(new Color(0, 64, 0));
	canvas.strokeStyle(null, 0);
	canvas.rect(5.0, -3.33, 1.33, 6.33);
    }

    takePicture(): Picture {
	const pic: Picture = new Picture(this.cameraShape[0], this.cameraShape[1]);
	const size: number = Math.max(this.robot.world.w, this.robot.world.h);
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
}
