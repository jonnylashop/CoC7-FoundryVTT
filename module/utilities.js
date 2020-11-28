import { CoC7Check } from './check.js';
import { CoC7Item } from './items/item.js';

export class CoC7Utilities {
	// static test(event){
	// 	if( event.shiftKey) ui.notifications.info('Hello from SHIFT utilities');
	// 	else ui.notifications.info('Hello from utilities');
	// 	const speaker = ChatMessage.getSpeaker();
	// 	let actor;
	// 	if (speaker.token) actor = game.actors.tokens[speaker.token];
	// 	if (!actor) actor = game.actors.get(speaker.actor);

	// 	actor.inflictMajorWound();
	// }

	static getCharacteristicNames( char){
		const charKey = char.toLowerCase();

		switch( charKey){
		case 'str': return { short: game.i18n.localize('CHARAC.STR'), label: game.i18n.localize('CHARAC.Strength')};
		case 'con': return { short: game.i18n.localize('CHARAC.CON'), label: game.i18n.localize('CHARAC.Constitution')};
		case 'siz': return { short: game.i18n.localize('CHARAC.SIZ'), label: game.i18n.localize('CHARAC.Size')};
		case 'dex': return { short: game.i18n.localize('CHARAC.DEX'), label: game.i18n.localize('CHARAC.Dexterity')};
		case 'app': return { short: game.i18n.localize('CHARAC.APP'), label: game.i18n.localize('CHARAC.Appearance')};
		case 'int': return { short: game.i18n.localize('CHARAC.INT'), label: game.i18n.localize('CHARAC.Intelligence')};
		case 'pow': return { short: game.i18n.localize('CHARAC.POW'), label: game.i18n.localize('CHARAC.Power')};
		case 'edu': return { short: game.i18n.localize('CHARAC.EDU'), label: game.i18n.localize('CHARAC.Education')};
		default: {
			for (const [, value] of Object.entries(game.system.template.Actor.templates.characteristics.characteristics)) {
				if( charKey == game.i18n.localize( value.short).toLowerCase()) return { short: game.i18n.localize(value.short), label: game.i18n.localize(value.label)};
			} 
			return null;
		}
		}
	}


	static convertDifficulty( difficulty){
		if( typeof( difficulty) != 'string') return difficulty;
		if( !isNaN(Number(difficulty))) return Number(difficulty);

		switch (difficulty) {
		case '?':
			return CoC7Check.difficultyLevel.unknown;
		case '+':
			return CoC7Check.difficultyLevel.hard;
		case '++':
			return CoC7Check.difficultyLevel.extreme;
		case '+++':
			return CoC7Check.difficultyLevel.critical;
		default:
			return CoC7Check.difficultyLevel.regular;
		}
	}

	static skillCheckMacro( skill, event, options={}){
		event.preventDefault();
		const speaker = ChatMessage.getSpeaker();
		let actor;
		if (speaker.token) actor = game.actors.tokens[speaker.token];
		if (!actor) actor = game.actors.get(speaker.actor);

		if( !actor){
			ui.notifications.warn( game.i18n.localize( 'CoC7.WarnNoActorAvailable'));
			return;
		}

		actor.skillCheck( skill, event.shiftKey, options);
	}

	static weaponCheckMacro( weapon, event){
		event.preventDefault();
		const speaker = ChatMessage.getSpeaker();
		let actor;
		if (speaker.token) actor = game.actors.tokens[speaker.token]; //!! Ca recupere l'acteur pas l'acteur du token !!
		if (!actor) actor = game.actors.get(speaker.actor);

		if( !actor){
			ui.notifications.warn( game.i18n.localize( 'CoC7.WarnNoActorAvailable'));
			return;
		}
		
		actor.weaponCheck( weapon, event.shiftKey);
	}

	static async createMacro(bar, data, slot){
		if ( data.type !== 'Item' ) return;

		let item;
		let origin;
		let packName = null;

		if (data.pack) {
			const pack = game.packs.get(data.pack);
			if (pack.metadata.entity !== 'Item') return;
			packName = data.pack;
			item = await pack.getEntity(data.id);
			origin = 'pack';
		} else if (data.data) {
			item = data.data;
			origin = 'actor';
		} else {
			item = game.items.get(data.id);
			origin = 'game';
		}

		if( !item) return ui.notifications.warn( game.i18n.localize( 'CoC7.WarnMacroNoItemFound'));
		if( !('weapon' == item.type) && !('skill' == item.type)) return ui.notifications.warn( game.i18n.localize( 'CoC7.WarnMacroIncorrectType'));

		let command;

		if( 'weapon' == item.type){
			command = `game.CoC7.macros.weaponCheck({name:'${item.name}', id:'${item._id}', origin:'${origin}', pack: '${packName}'}, event);`;
		}

		if( 'skill' == item.type){
			if( CoC7Item.isAnySpec( item)) return ui.notifications.warn( game.i18n.localize( 'CoC7.WarnNoGlobalSpec'));
			command = `game.CoC7.macros.skillCheck({name:'${item.name}', id:'${item._id}', origin:'${origin}', pack: '${packName}'}, event);`;
		}

		// Create the macro command
		let macro = game.macros.entities.find(m => (m.name === item.name) && (m.command === command));
		if ( !macro ) {
			macro = await Macro.create({
				name: item.name,
				type: 'script',
				img: item.img,
				command: command
			});
		}
		game.user.assignHotbarMacro(macro, slot);
		return false;
	}

	static async toggleDevPhase(){
		const isDevEnabled = game.settings.get('CoC7', 'developmentEnabled');
		await game.settings.set( 'CoC7', 'developmentEnabled', !isDevEnabled);
		let group = ui.controls.controls.find(b => b.name == 'token');
		let tool = group.tools.find( t => t.name == 'devphase');
		tool.title = game.settings.get('CoC7', 'developmentEnabled')? game.i18n.localize( 'CoC7.DevPhaseEnabled'): game.i18n.localize( 'CoC7.DevPhaseDisabled');
		ui.notifications.info( game.settings.get('CoC7', 'developmentEnabled')? game.i18n.localize( 'CoC7.DevPhaseEnabled'): game.i18n.localize( 'CoC7.DevPhaseDisabled'));
		ui.controls.render();
		game.socket.emit('system.CoC7', {
			type : 'updateChar'
		});
		CoC7Utilities.updateCharSheets();
	}

	static async toggleCharCreation(){
		const isCharCreation = game.settings.get('CoC7', 'charCreationEnabled');
		await game.settings.set( 'CoC7', 'charCreationEnabled', !isCharCreation);
		let group = ui.controls.controls.find(b => b.name == 'token');
		let tool = group.tools.find( t => t.name == 'charcreate');
		tool.title = game.settings.get('CoC7', 'charCreationEnabled')? game.i18n.localize( 'CoC7.CharCreationEnabled'): game.i18n.localize( 'CoC7.CharCreationDisabled');
		ui.notifications.info( game.settings.get('CoC7', 'charCreationEnabled')? game.i18n.localize( 'CoC7.CharCreationEnabled'): game.i18n.localize( 'CoC7.CharCreationDisabled'));
		ui.controls.render();
		game.socket.emit('system.CoC7', {
			type : 'updateChar'
		});		
		CoC7Utilities.updateCharSheets();
	}

	static updateCharSheets(){
		if( game.user.isGM){
			game.actors.entities.forEach( a => {
				if( 'character' == a?.data?.type && a?.sheet && a?.sheet?.rendered){
					a.render( false);
				}
			});
		} else{
			game.actors.entities.forEach( a => {
				if( a.owner){
					a.render( false);
				}
			});
		}

		
		return;
	}
}