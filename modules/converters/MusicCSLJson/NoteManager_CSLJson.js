define(['modules/core/NoteModel'], function(NoteModel) {
	function NoteManager_CSLJson(MusicCSLJSON) {

	};

	NoteManager_CSLJson.prototype.importFromMusicCSLJSON = function(notes, song) {
		if (typeof notes !== "undefined") {
			for (var i in notes) {
				this.addNote(new NoteModel(notes[i]));
			}
		}
		this.setNotesBarNum(song);
		return this;
	};

	NoteManager_CSLJson.prototype.exportToMusicCSLJSON = function(noteManager, from, to) {
		var notes = [];
		noteManager.getNotes(from, to + 1).forEach(function(note) {
			notes.push(note.exportToMusicCSLJSON(songModel));
		});
		return notes;
	};
	return NoteManager_CSLJson;
});