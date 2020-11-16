import {
    ITranslator,
    TranslationBundle
} from '@jupyterlab/translation';

import { StackedPanel } from '@lumino/widgets';
import {Canvas, Color, Vector} from "./utils";

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
	this._canvas = new Canvas(2000, 500);

	const world: World = new World(500, 250);
	world.addBox(100, 0, 110, 110, new Color(0));
	world.addBox(200, 95, 210, 170, new Color(255, 0, 255));
	world.addBox(300, 10, 310, 95, new Color(255, 255, 0));
	world.addBox(300, 190, 310, 240, new Color(255, 128, 0));
	// Create robot, and add to world:
	const robot: Robot = new Robot(400, 50, 0);
	world.addRobot(robot);
	robot.va = -0.05;
	robot.vx = 3.0;
	this._canvas.scale(2, 2);
	this._canvas.font("15px Arial");

	window.setInterval(() => {
	    this._canvas.clear();
	    world.update(this._canvas);
	    let pic: Picture = robot.takePicture();
	    this._canvas.picture(pic, 2 * 500, 0, 2.0);
	    this._canvas.fill(new Color(0, 0, 0, 255));
	    this._canvas.text(`IR[0]: ${robot.getIR(0)}`, 520, 150);
	    this._canvas.text(`IR[1]: ${robot.getIR(1)}`, 520, 170);
	}, 1000 / 10);

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
