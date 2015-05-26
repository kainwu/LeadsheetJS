define([
	"modules/Edition/src/KeyboardManager",
	"modules/Cursor/src/Cursor",
	"modules/NoteEdition/src/NoteEdition",
	"modules/ChordEdition/src/ChordEdition",
	"modules/StructureEdition/src/StructureEdition",
	"modules/TextEdition/src/TextElementManager"
], function(KeyboardManager, Cursor, NoteEdition, ChordEdition, StructureEdition, TextElementManager) {

	function Edition(viewer, songModel, menuModel, params) {
		if (!params) {
			throw "Edition - need params";
		}

		new KeyboardManager(true);
		
		//editing title
		new TextElementManager(viewer, songModel);

		var values = {};
		var cursorNote;
		if (params.notes) {
			// Edit notes on view
			cursorNote = new Cursor(songModel.getComponent('notes'), 'notes', 'arrow');
			var noteEdition = new NoteEdition(songModel, cursorNote.controller.model, viewer, params.notes.imgPath);
			values.cursorNote = cursorNote;
			//values.notes = noteEdition;

			if (menuModel && params.notes.menu){
				menuModel.addMenu({
					title: params.notes.menu.title,
					view: noteEdition.view,
					order: params.notes.menu.order
				});
			}

		}
		if (params.chords) {
			// // Edit chords on view
			var cursorChord = new Cursor(songModel.getSongTotalBeats(), 'chords', 'tab');
			cursorChord.controller.model.setEditable(false);
			var chordEdition = new ChordEdition(songModel, cursorChord.controller.model, viewer, params.chords.imgPath);
			values.cursorChord = cursorChord;
			//values.chords = chordEdition;
			if (params.chords.menu){
				menuModel.addMenu({
					title:  params.chords.menu.title,
					view: chordEdition.view,
					order: params.chords.menu.order
				});
			}
		}

		if (params.structure) {
			if (!params.notes) {
				throw "Edition: to add structure, cursor of notes edition needed";
			}
			//bars edition 
			var structEdition = new StructureEdition(songModel, cursorNote.controller.model, params.structure.imgPath);
			//values.structure = structEdition;
			if (params.structure.menu){
				menuModel.addMenu({
					title: params.structure.menu.title,
					view: structEdition.view,
					order: params.structure.menu.order
				});
			}
		}
		return values;

	}
	return Edition;
});