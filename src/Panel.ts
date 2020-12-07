import {
    ITranslator,
    TranslationBundle
} from '@jupyterlab/translation';

import { StackedPanel } from '@lumino/widgets';
import {Canvas, Color} from "./utils";

import {World} from "./World";
import {Robot} from "./Robot";
import {Picture} from "./utils";

const PANEL_CLASS = 'jyro-panel';

export class JyroRobot extends StackedPanel {
    private _translator: ITranslator;
    private _trans: TranslationBundle;
    private _canvas: Canvas;

    constructor(translator: ITranslator, robot: Robot) {
	super();
	this._canvas = new Canvas(500, 500, 2.0); // width, height, scale
	this._canvas.font("13px Arial");

	window.setInterval(() => {
	    let pic: Picture = robot.cameras[0].takePicture();
	    this._canvas.clear();
	    this._canvas.picture(pic, 0, 0, 2.0); // x, y, scale
	    this._canvas.fill(new Color(0, 0, 0, 255));
	    let line: number = 130;
	    for (let index=0; index < robot.range_sensors.length; index++) {
		this._canvas.text(`IR[${index}]: ${this.format(robot.range_sensors[index].getReading())}`, 10, line+=15);
	    }
	    this._canvas.text(`Time: ${this.format(robot.time, 1)}`, 10, line+=20);
	}, 1000 / 20); // updates per second

	this._translator = translator;
	this._trans = this._translator.load('jupyterlab');

	this.addClass(PANEL_CLASS);
	this.id = 'JyroPanel';
	this.title.label = this._trans.__('Jyro: Robot ' + robot.name);
	this.title.closable = true;

	this.addWidget(this._canvas);
    }

    format(v: number, decimals: number = 2): number {
	return parseFloat(v.toFixed(decimals));
    }
}

export class JyroPanel extends StackedPanel {
    private _translator: ITranslator;
    private _trans: TranslationBundle;
    private _canvas: Canvas;

    constructor(translator: ITranslator, world: World) {
	super();
	this._canvas = new Canvas(1000, 500, 2.0); // width, height, scale

	world.addBox(new Color(0), 100, 0, 110, 110);
	world.addBox(new Color(255, 0, 255), 200, 95, 210, 170);
	world.addBox(new Color(255, 255, 0), 300, 0, 310, 95);
	world.addBox(new Color(255, 128, 0), 300, 190, 310, 250);
	for (let index = 0; index< world.robots.length; index++) {
	    world.robots[index].va = -0.025;
	    world.robots[index].vx = 1.5;
	}
	this._canvas.font("15px Arial");

	window.setInterval(() => {
	    world.update(this._canvas, world.time);
	    for (let index = 0; index< world.robots.length; index++) {
		let robot: Robot = world.robots[index];
		if (robot.stalled) {
		    robot.va = 0;
		    robot.vx = 0;
		} else {
		    robot.va += Math.random() * 0.025 - 0.025/2;
		    robot.va = Math.min(Math.max(robot.va, -0.1), 0.1)
		    robot.vx += Math.random() * 0.25 - 0.25/2;
		    robot.vx = Math.min(Math.max(robot.vx, -1.5), 1.5)
		}
	    }
	    world.time += 0.05; // time, in seconds
	}, 1000 / 20); // updates per second

	this._translator = translator;
	this._trans = this._translator.load('jupyterlab');

	this.addClass(PANEL_CLASS);
	this.id = 'JyroPanel';
	this.title.label = this._trans.__('Jyro');
	this.title.closable = true;

	this.addWidget(this._canvas);
    }

    getCanvas(): Canvas {
	return this._canvas;
    }
}
