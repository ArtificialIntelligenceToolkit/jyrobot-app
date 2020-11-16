import {
    JupyterFrontEnd,
    JupyterFrontEndPlugin
} from '@jupyterlab/application';
import { ILauncher } from '@jupyterlab/launcher';
import { ICommandPalette } from '@jupyterlab/apputils';
import { IMainMenu } from '@jupyterlab/mainmenu';
import {
    ITranslator,
    nullTranslator
} from '@jupyterlab/translation';

import { JyroPanel } from './Panel';

const extension: JupyterFrontEndPlugin<void> = {
    id: 'jyro',
    autoStart: true,
    requires: [ICommandPalette, ITranslator, ILauncher, IMainMenu],
    activate: (
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

	function createPanel(): Promise<JyroPanel> {
	    let panel: JyroPanel;
	    return manager.ready.then(async () => {
		panel = new JyroPanel(trans);
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
    }
};

export default extension;
