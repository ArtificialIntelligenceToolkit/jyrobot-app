import {
    JupyterFrontEnd,
    JupyterFrontEndPlugin
} from '@jupyterlab/application';
import { ILauncher } from '@jupyterlab/launcher';
import { ICommandPalette } from '@jupyterlab/apputils';
import { IMainMenu } from '@jupyterlab/mainmenu';
import { Menu } from '@lumino/widgets';
import { CommandRegistry } from '@lumino/commands';
import {
    ITranslator,
    nullTranslator
} from '@jupyterlab/translation';

import { JyroRobot, JyroPanel } from './Panel';
import { Robot } from './Robot';
import {World} from './World';
import {Color} from './utils';
import {requestAPI} from './handler';

export async function populateMenu(commands: CommandRegistry,
				   shell: JupyterFrontEnd.IShell,
				   mainMenu: IMainMenu,
				   translator: ITranslator,
				   robots: Robot[]) {

    const open_table = "jyrobot:open-robot";

    const jyroMenu = new Menu({commands});
    jyroMenu.title.label = 'Jyrobot';
    for (const robot of robots) {
	// Get the name here:
	for (let index=0; index < robot.cameras.length; index++) {
	    const command = "jyrobot:open-robot-" + robot.name + "-" + index;
	    commands.addCommand(command, {
		label: "View Robot " + robot.name + " Camera " + index,
		execute: () => {
		    const widget = new JyroRobot(translator, robot, index);
		    shell.add(widget, 'main');
		}
	    });
	    jyroMenu.addItem({command});
	}
    }

    const jyroGroup = [
	{type: "submenu", submenu: jyroMenu} as Menu.IItemOptions,
	{type: "separator"} as Menu.IItemOptions
    ];
    mainMenu.viewMenu.addGroup(jyroGroup, 0);
}


const extension: JupyterFrontEndPlugin<void> = {
    id: 'jyrobot',
    autoStart: true,
    requires: [ICommandPalette, ITranslator, ILauncher, IMainMenu],
    activate: async (
	app: JupyterFrontEnd,
	palette: ICommandPalette,
	translator: ITranslator,
	launcher: ILauncher,
	mainMenu: IMainMenu
    ) => {
	console.log('JupyterLab extension jyrobot is activated!');
	const { commands, shell } = app;
	const manager = app.serviceManager;
	const trans = translator || nullTranslator;
	const _trans = trans.load('jupyterlab');

	requestAPI<any>('get_example')
	    .then(data => {
		console.log(data);
	    })
	    .catch(reason => {
		console.error(
		    `The jyrobot server extension appears to be missing.\n${reason}`
		);
	    });
	
	let config: any = {
	    world: {
		width: 500,
		height: 250,
		boxes: [
		    {color: [  0, 0,   0], p1: {x: 100, y: 0}, p2: {x: 110, y: 110}},
		    {color: [255, 0, 255], p1: {x: 200, y: 95}, p2: {x: 210, y: 170}},
		    {color: [255, 255, 0], p1: {x: 300, y: 0}, p2: {x: 310, y: 95}},
		    {color: [255, 128, 0], p1: {x: 300, y: 190}, p2: {x: 310, y: 250}},
		],
	    },
	    robots: [
		{
		    name: "Red",
		    x: 430, y: 50, direction: Math.PI,
		    color: [255, 0, 0],
		    cameras: [{type: "Camera", width: 256, height: 128, colorsFadeWithDistance: 1.0,
			       angle: 60}],
		    rangeSensors: [
			{position: 8.2, direction: 0, max: 100, width: 0.05},
			{position: 8.2, direction: Math.PI/8, max: 20, width: 1.0},
			{position: 8.2, direction: -Math.PI/8, max: 20, width: 1.0},
		    ],
		    body: [ // CM
			[4.17, 5.0], [4.17, 6.67], [5.83, 5.83], [5.83, 5.0], [7.5, 5.0], [7.5, -5.0], [5.83, -5.0],
			[5.83, -5.83], [4.17, -6.67], [4.17, -5.0], [-4.17, -5.0], [-4.17, -6.67], [-5.83, -5.83],
			[-6.67, -5.0], [-7.5, -4.17], [-7.5, 4.17], [-6.67, 5.0], [-5.83, 5.83], [-4.17, 6.67],
			[-4.17, 5.0]
		    ],
		},
		{
		    name: "Blue",
		    x: 30, y: 50, direction: 0,
		    color: [0, 0, 255],
		    cameras: [
			{type: "DepthCamera", width: 256, height: 128, colorsFadeWithDistance: 1.0, angle: 60},
			{type: "Camera", width: 256, height: 128, colorsFadeWithDistance: 1.0, angle: 60},
		    ],
		    rangeSensors: [
			{position: 8.2, direction: 0, max: 100, width: 0.05},
			{position: 8.2, direction: Math.PI/8, max: 20, width: 1.0},
			{position: 8.2, direction: -Math.PI/8, max: 20, width: 1.0},
		    ],
		    body: [ // CM
			[4.17, 5.0], [4.17, 6.67], [5.83, 5.83], [5.83, 5.0], [7.5, 5.0], [7.5, -5.0], [5.83, -5.0],
			[5.83, -5.83], [4.17, -6.67], [4.17, -5.0], [-4.17, -5.0], [-4.17, -6.67], [-5.83, -5.83],
			[-6.67, -5.0], [-7.5, -4.17], [-7.5, 4.17], [-6.67, 5.0], [-5.83, 5.83], [-4.17, 6.67],
			[-4.17, 5.0]
		    ],
		},
	    ]};
	const world: World = new World(config.world);
	// Create robot, and add to world:
	for (let robotConfig of config.robots)  {
	    let robot: Robot = new Robot(robotConfig);
	    world.addRobot(robot);
	}

	function createPanel(): Promise<JyroPanel> {
	    let panel: JyroPanel;
	    return manager.ready.then(async () => {
		panel = new JyroPanel(commands, trans, world);
		shell.add(panel, 'main');
		return panel;
	    });
	}

	// Add launcher
	if (launcher) {
	    console.log(launcher);
	    launcher.add({
		command: "jyrobot:launch",
		category: _trans.__("Applications")
	    });
	}

	commands.addCommand("jyrobot:launch", {
	    label: 'Launch Jyrobot',
	    caption: 'Launch Jyrobot',
	    execute: createPanel
	});

	await populateMenu(commands, shell, mainMenu, translator, world.robots);
    }
};

export default extension;
