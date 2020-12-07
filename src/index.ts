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

export async function populateMenu(commands: CommandRegistry,
				   shell: JupyterFrontEnd.IShell,
				   mainMenu: IMainMenu,
				   translator: ITranslator,
				   robots: Robot[]) {
    
    const open_table = "jyro:open-robot";
    
    const jyroMenu = new Menu({commands});
    jyroMenu.title.label = 'Jyro';
    for (const robot of robots) {
	// Get the name here:
	const command = "jyro:open-robot-" + robot.name;
	console.log("command", command);
	commands.addCommand(command, {
	    label: "Open " + robot.name,
	    //icon: ICON_TABLE[table_type.name],
	    execute: () => {
		const widget = new JyroRobot(translator, robot);
		shell.add(widget, 'main');
	    }
	});
	jyroMenu.addItem({command});
    }

    const jyroGroup = [
	{type: "submenu", submenu: jyroMenu} as Menu.IItemOptions,
	{type: "separator"} as Menu.IItemOptions
    ];
    mainMenu.viewMenu.addGroup(jyroGroup, 0);
}


const extension: JupyterFrontEndPlugin<void> = {
    id: 'jyro',
    autoStart: true,
    requires: [ICommandPalette, ITranslator, ILauncher, IMainMenu],
    activate: async (
	app: JupyterFrontEnd,
	palette: ICommandPalette,
	translator: ITranslator,
	launcher: ILauncher,
	mainMenu: IMainMenu
    ) => {
	console.log('JupyterLab extension jyro is activated!');
	const { commands, shell } = app;
	const manager = app.serviceManager;
	const trans = translator || nullTranslator;
	const _trans = trans.load('jupyterlab');

	const world: World = new World(500, 250);
	// Create robot, and add to world:
	let robot: Robot = new Robot("Red", 430, 50, 0, new Color(255, 0, 0));
	world.addRobot(robot);
	robot = new Robot("Blue", 30, 50, 0, new Color(0, 0, 255))
	world.addRobot(robot);

	function createPanel(): Promise<JyroPanel> {
	    let panel: JyroPanel;
	    return manager.ready.then(async () => {
		panel = new JyroPanel(trans, world);
		shell.add(panel, 'main');
		return panel;
	    });
	}

	// Add launcher
	if (launcher) {
	    console.log(launcher);
	    launcher.add({
		command: "jyro:launch",
		category: _trans.__("Applications")
	    });
	}

	commands.addCommand("jyro:launch", {
	    label: 'Launch Jyro',
	    caption: 'Launch Jyro',
	    execute: createPanel
	});

	await populateMenu(commands, shell, mainMenu, translator, world.robots);
    }
};

export default extension;
