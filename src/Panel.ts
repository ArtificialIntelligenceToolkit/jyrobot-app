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

export class JyroPanel extends StackedPanel {
    private _translator: ITranslator;
    private _trans: TranslationBundle;
    private _canvas: Canvas;

    constructor(translator: ITranslator) {
	super();
	this._canvas = new Canvas(2000, 500, 2.0); // width, height, scale

	const world: World = new World(500, 250);
	world.addBox(new Color(0), 100, 0, 110, 110);
	world.addBox(new Color(255, 0, 255), 200, 95, 210, 170);
	world.addBox(new Color(255, 255, 0), 300, 0, 310, 95);
	world.addBox(new Color(255, 128, 0), 300, 190, 310, 250);
	// Create robot, and add to world:
	const robot: Robot = new Robot(430, 50, 0);
	world.addRobot(robot);
	robot.va = -0.025;
	robot.vx = 1.5;
	this._canvas.font("15px Arial");

	window.setInterval(() => {
	    world.update(this._canvas);
	    let pic: Picture = robot.takePicture();
	    this._canvas.picture(pic, 2 * 500, 0, 2.0);
	    this._canvas.fill(new Color(0, 0, 0, 255));
	    this._canvas.text(`IR[0]: ${robot.getIR(0)}`, 520, 150);
	    this._canvas.text(`IR[1]: ${robot.getIR(1)}`, 520, 170);
	    this._canvas.text(`Time: ${world.time}`, 520, 190);
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
