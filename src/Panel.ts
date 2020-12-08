import { CommandRegistry } from '@lumino/commands';
import {
    ITranslator,
    TranslationBundle
} from '@jupyterlab/translation';
import {
    CommandToolbarButton,
    ICommandPalette,
    MainAreaWidget,
    WidgetTracker,
} from '@jupyterlab/apputils';
import { addIcon, clearIcon, listIcon, runIcon, fastForwardIcon, stopIcon } from '@jupyterlab/ui-components';

import {World} from "./World";
import {Robot} from "./Robot";
import {Canvas, Color, Picture} from "./utils";

const PANEL_CLASS = 'jyrobot-panel';

export class JyroRobot extends MainAreaWidget {
    private _translator: ITranslator;
    private _trans: TranslationBundle;
    private _canvas: Canvas;

    constructor(translator: ITranslator, robot: Robot) {
	const canvas = new Canvas(500, 500, 2.0); // width, height, scale
	super({content: canvas});
	this._canvas = canvas;
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
	this.id = 'JyrobotPanel';
	this.title.label = this._trans.__('Jyrobot: Robot ' + robot.name);
	this.title.closable = true;

	//this.addWidget(this._canvas);
    }

    format(v: number, decimals: number = 2): number {
	return parseFloat(v.toFixed(decimals));
    }
}

export class JyroPanel extends MainAreaWidget {
    private _translator: ITranslator;
    private _trans: TranslationBundle;
    private _canvas: Canvas;
    private _scale: number;

    constructor(commands: CommandRegistry, translator: ITranslator, world: World) {
	const canvas = new Canvas(2000, 2000, 1.0); // width, height, scale
	super({content: canvas});
	this._canvas = canvas;
	this._canvas.font("15px Arial");

	let updates_per_second = 10;
	let panel = this;

	// Update and draw it once:
	world.update(world.time);
	// A second time to allow all robots to see each other:
	world.update(world.time);
	world.draw(panel._canvas);

	// Itinitalize robot velocities:
	for (let index = 0; index< world.robots.length; index++) {
	    world.robots[index].va = -0.025;
	    world.robots[index].vx = 1.5;
	}
	let runLoop = function() {
	    world.update(world.time);
	    world.draw(panel._canvas);
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
	    world.time += 1/updates_per_second;
	}

	let loop: number= null;

	this._translator = translator;
	this._trans = this._translator.load('jupyterlab');

	this.addClass(PANEL_CLASS);
	this.id = 'JyrobotPanel';
	this.title.label = this._trans.__('Jyrobot');
	this.title.closable = true;
	this._scale = 1.0;

	const mycommands = new CommandRegistry();

	mycommands.addCommand('jyrobot/world:stop', {
	    execute: () => {
		clearInterval(loop);
		loop = null;
	    },
	    icon: stopIcon,
	});

	mycommands.addCommand('jyrobot/world:start', {
	    execute: () => {
		if (loop === null) {
		    loop = window.setInterval(runLoop, 1000 / updates_per_second);
		}
	    },
	    icon: fastForwardIcon,
	});

	mycommands.addCommand('jyrobot/world:step', {
	    execute: () => {
		if (loop === null) {
		    world.update(world.time);
		    world.draw(panel._canvas);
		}
	    },
	    icon: runIcon,
	});

	mycommands.addCommand('jyrobot/world:zoom-in', {
	    execute: () => {
		this._scale *= 1.1;
		canvas.resetScale();
		canvas.scale(this._scale, this._scale);
		if (loop === null)
		    world.draw(panel._canvas);

	    },
	    icon: addIcon,
	});

	mycommands.addCommand('jyrobot/world:zoom-out', {
	    execute: () => {
		this._scale *= 0.9;
		canvas.resetScale();
		canvas.scale(this._scale, this._scale);
		if (loop === null)
		    world.draw(panel._canvas);
	    },
	    icon: clearIcon,
	});

	this.toolbar.addItem(
            'zoom-in',
            new CommandToolbarButton({
		commands: mycommands,
		id: 'jyrobot/world:zoom-in'
            })
	);
	this.toolbar.addItem(
            'zoom-out',
            new CommandToolbarButton({
		commands: mycommands,
		id: 'jyrobot/world:zoom-out'
            })
	);
	this.toolbar.addItem(
            'step',
            new CommandToolbarButton({
		commands: mycommands,
		id: 'jyrobot/world:step'
            })
	);
	this.toolbar.addItem(
            'start',
            new CommandToolbarButton({
		commands: mycommands,
		id: 'jyrobot/world:start'
            })
	);
	this.toolbar.addItem(
            'stop',
            new CommandToolbarButton({
		commands: mycommands,
		id: 'jyrobot/world:stop'
            })
	);
    }

    getCanvas(): Canvas {
	return this._canvas;
    }
}
