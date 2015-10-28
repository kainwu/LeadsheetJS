define(['modules/core/src/NoteModel', 'utils/NoteUtils'], function(NoteModel, NoteUtils) {
	function NoteManager() {
		this.notes = [];
	}

	// Interface functions (this functions are also in ChordManagerModel)

	/**
	 * @interface
	 * @return {integer}
	 */
	NoteManager.prototype.getTotal = function() {
		return this.notes.length;
	};
	/**
	 * returns duration in number of beats
	 * @param  {Integer} pos1
	 * @param  {Integer} pos2
	 * @return {float}
	 */
	NoteManager.prototype.getTotalDuration = function(pos1, pos2) {
		var notes = this.getNotes(pos1, pos2);
		var totalDur = 0;
		notes.forEach(function(note) {
			totalDur += note.getDuration();
		});
		return roundBeat(totalDur);
	};

	NoteManager.prototype.addNote = function(note, pos) {
		if (!note instanceof NoteModel) throw "note is not an instance of Note";
		if (typeof pos === "undefined") {
			this.notes.push(note);
		} else { //check
			this.notes.splice(pos, 0, note);
		}
	};
	/**
	 * @param  {integer} by default 0
	 * @return {NoteModel}
	 */
	NoteManager.prototype.getNote = function(pos) {
		pos = pos || 0;
		return this.notes[pos];
	};

	NoteManager.prototype.deleteNote = function(pos) {
		if (typeof pos === "undefined") throw "pos undefined. Can't delete note";
		var notes = this.getNotes();
		this.notes.splice(pos, 1);
	};

	/**
	 * gets notes (by reference. To clone use cloneElems)
	 * @param  {Integer} from :  index, if not specified, 0
	 * @param  {Integer} to   :  index, first note that is not taken, e.g if to = 4, notes will be taken from 'from' to 3.
	 * @return {Array}   array of NoteModel
	 */
	NoteManager.prototype.getNotes = function(from, to) {
		return this.notes.slice(from, to);
	};

	/**
	 * [setNotes description]
	 * @param {Array} notes array of NoteModel
	 */
	NoteManager.prototype.setNotes = function(notes) {
		if (typeof notes !== "undefined") this.notes = notes;
	};

	/**
	 * @interface
	 *
	 * returns a copy of the notes from, pos1, to pos2.
	 * @param  {Integer} pos1 if not specified, 0
	 * @param  {Integer} pos2 first note that is not taken, e.g if to = 4, notes will be taken from 'from' to 3.
	 * @return {Array}  array of cloned NoteModel
	 */
	NoteManager.prototype.cloneElems = function(pos1, pos2) {
		var newNotes = [];
		var notesToClone = this.getNotes(pos1, pos2);
		var note;
		notesToClone.forEach(function(note) {
			newNotes.push(note.clone());
		});
		return newNotes;
	};


	/**
	 * replace notes from pos1 to pos2+1, by default will always replace one note, if we want to insert notes at
	 * position pos without replacing note at 'pos' (e.g. scoreeditor.addBar() does it) we need to call it with cursor = [pos, pos -1 ]
	 * @param  {Array} cursor       [pos1,pos2]
	 * @param  {Array } notesToPaste array of NoteModel
	 */
	NoteManager.prototype.notesSplice = function(cursor, notesToPaste) {
		var part1 = this.notes.slice(0, cursor[0]);
		var part2 = this.notes.slice(cursor[1] + 1, this.notes.length); //selected notes are removed
		var copyArr = [];
		for (var i = 0, c = notesToPaste.length; i < c; i++) copyArr.push(notesToPaste[i].clone());
		this.notes = part1.concat(copyArr, part2);
	};

	/**
	 * Adds notes in a given position (special case of noteSplice)
	 * @param {Array of NoteModel} notes
	 * @param {Integer} position
	 */
	NoteManager.prototype.addNotes = function(notes, position) {
		if (position === undefined) {
			position = this.notes.length;
		}
		this.notesSplice([position, position - 1], notes);
	};
	/**
	 * returns the global beat of a note specified by its index (starting at 1)
	 * @param  {Integer} index of the note
	 * @return {Float}   beat
	 */
	NoteManager.prototype.getNoteBeat = function(index) {
		if (typeof index === "undefined" || isNaN(index) ||
			index >= this.notes.length || index < 0) {
			throw "NoteManager - getNoteBeat: problem with index " + index;
		}
		var noteBeat = 1, // because beats are based on 1
			i;
		for (i = 0; i < index; i++) {
			noteBeat += this.notes[i].getDuration();
		}
		return roundBeat(noteBeat);
	};

	/**
	 *
	 * @return {Array} array of pitches of all the notes. e.g.  ["Db/4", "E/4", "F/4", "A#/4", "C/5", "B/4"]
	 */
	NoteManager.prototype.getNotesAsString = function() {
		var arrPitches = [];
		this.notes.forEach(function(note) {
			arrPitches.push(note.toString());
		});
		return arrPitches;
	};


	/**
	 * FUNCTION DOES NOT WORK AS EXPECTED
	 * @param  {NoteModel} note
	 * @return {Integer}
	 */
	NoteManager.prototype.getNoteIndex = function(note) {
		if (typeof note !== "undefined" && note instanceof NoteModel) {
			console.warn('getNoteIndex does not work as expected');
			for (var i = 0; i < this.notes.length; i++) {
				if (JSON.stringify(this.notes[i].serialize(true)) === JSON.stringify(note.serialize(true))) {
					return i;
				}
			}
		}
		return undefined;
	};
	
	NoteManager.prototype.getIndexesBetweenBarNumbers = function(barNum1, barNum2, song) {
		if (!song){
			throw "NoteManager - getNotesBetweenBarNumbers - missing parameter song";
		}
		var barMng = song.getComponent('bars');
		var startBeat = song.getStartBeatFromBarNumber(barNum1);
		var endBeat = (barMng.getTotal() - 1 === barNum2) ? null : song.getStartBeatFromBarNumber(barNum2 + 1);
		return this.getIndexesStartingBetweenBeatInterval(startBeat, endBeat);
	};
	NoteManager.prototype.getNotesBetweenBarNumbers = function(barNum1, barNum2, song) {
		var indexes = this.getIndexesBetweenBarNumbers(barNum1, barNum2, song);
		return this.getNotes(indexes[0],indexes[1]);
	};

	NoteManager.prototype.getNotesAtBarNumber = function(barNumber, song) {
		if (!song) {
			throw "NoteManager - getNotesAtBarNumber - incorrect song parameter";
		}

		var startBeat = 1,
			endBeat;
		startBeat = song.getStartBeatFromBarNumber(barNumber);
		endBeat = startBeat + song.getTimeSignatureAt(barNumber).getQuarterBeats();
		//console.log(this.getTotalDuration() + 1, endBeat, startBeat, song.getTimeSignatureAt(barNumber).getQuarterBeats());
		if (this.getTotalDuration() + 1 < endBeat) {
			console.warn("NoteManager - getNotesAtBarNumber - notes on bar " + barNumber + " do not fill the total bar duration" + (this.getTotalDuration() + 1) + ' ' + endBeat);
			//throw "NoteManager - getNotesAtBarNumber - notes on bar " + barNumber + " do not fill the total bar duration" + (this.getTotalDuration() + 1) + ' ' + endBeat;
		}

		return this.getNotes(
			this.getNextIndexNoteByBeat(startBeat),
			this.getNextIndexNoteByBeat(endBeat)
		);
	};

	NoteManager.prototype.getNoteBarNumber = function(index, song) {
		if (isNaN(index) || index < 0 || typeof song === "undefined") {
			throw "NoteManager - getNoteBarNumber - attributes are not what expected, song: " + song + ", index: " + index;
		}
		var numBar = 0,
			duration = 0;

		var barNumBeats = song.getBarNumBeats(numBar, null);
		for (var i = 0; i <= index; i++) {
			if (roundBeat(duration) == barNumBeats) {
				numBar++;
				duration = 0;
				barNumBeats = song.getBarNumBeats(numBar, barNumBeats);
			}
			duration += this.notes[i].getDuration();
		}
		return numBar;
	};

	/**
	 * @param  {integer} start
	 * @param  {integer} end
	 * @return {Array}
	 */
	NoteManager.prototype.getBeatIntervalByIndexes = function(start, end) {
		if (typeof start === "undefined" || isNaN(start) ||
			start >= this.notes.length || start < 0) {
			throw "NoteManager - getBeatIntervalByIndexes:  problem with start " + start;
		}
		if (typeof end === "undefined" || isNaN(end) ||
			end >= this.notes.length || end < 0) {
			throw "problem with end " + end;
		}
		var startBeat = this.getNoteBeat(start);
		var endBeat = this.getNoteBeat(end) + this.getNote(end).getDuration();
		endBeat = roundBeat(endBeat);
		return [startBeat, endBeat];
	};
	/**
	 * abstraction of code used by both getNextIndexNoteByBeat and getPrevIndexNoteByBeat
	 * @param  {} curBeat [description]
	 * @param  {[type]} beat    [description]
	 * @return {[type]}         [description]
	 */
	NoteManager.prototype._getIndexAndCurBeat = function(beat) {
		var i = 0,
			curNote,
			curBeat = 1;
		//we round in the comparison in order to not carry the rounding in curBeat (which is cumulative inside the iteration)
		while (roundBeat(curBeat) < beat) { //to avoid problems with tuplet 
			curNote = this.getNote(i);
			if (curNote === undefined) {
				// throw 'NoteManager - _getIndexAndCurBeat - Note not found (possibly beat is greater than last note beat)';
				return {
					index: undefined,
					curBeat: curBeat
				};
			}
			curBeat += curNote.getDuration();
			i++;
		}
		return {
			index: i,
			curBeat: curBeat
		};
	};
	/**
	 * Returns the index of the note found at the exact beat, and if not, at the
	 * closest note just after a given beat
	 * @param  {float} beat global beat (first beat starts at 1, not 0)
	 * @return {Integer} index of the note
	 * TODO: optimisation: accept object with cached index and beat to start from, useful when function is called in loops (iterator)
	 */
	NoteManager.prototype.getNextIndexNoteByBeat = function(beat) {
		if (isNaN(beat) || beat < 1) {
			throw 'NoteManager - getNextIndexNoteByBeat - beat must be a positive float greater than 1 ' + beat;
		}
		return this._getIndexAndCurBeat(beat).index;
	};


	/**
	 * Similar to previous one (getNextIndexNote()), but if
	 * exact beat is not found, it returns the closest previous note
	 * @param  {float} beat global beat (first beat starts at 1, not 0)
	 * @param  {ifExactExclude} if note with index X starts at beat, we will not include it, we'll return index X-1
	 *
	 * @return {Integer} index of the note
	 */
	NoteManager.prototype.getPrevIndexNoteByBeat = function(beat, ifExactExclude) {
		if (isNaN(beat) || beat < 0) {
			throw 'NoteManager - getPrevIndexNoteByBeat - beat must be a positive float ' + beat;
		}
		var r = this._getIndexAndCurBeat(beat);
		var index;
		if (r.curBeat === beat) {
			index = ifExactExclude ? r.index - 1 : r.index;
		} else {
			index = r.index - 1;
		}
		return index;
	};

	/**
	 * gets index of note who's start is between startBeat and endBeat, if endBeat exceed total duration, it returns last index end index
	 * @param  {Integer} startBeat
	 * @param  {Integer} endBeat
	 * @param {Boolean} ifExactExlude, default is false. 
	 *                                 ex: to get all notes of bar 1 we should do getIndexesStartingBetweenBeatInterval(1,5,true) or getIndexesStartingBetweenBeatInterval(1,4.99)
	 *                                 normally we want to not exclude because function getNotes(start,end) already excludes 'end' index and gets notes until end - 1
	 * @return {Array}           indexes e.g. [1,2]
	 */

	NoteManager.prototype.getIndexesStartingBetweenBeatInterval = function(startBeat, endBeat, ifExactExclude) {
		
		if (isNaN(startBeat) || startBeat < 0) {
			startBeat = 1;
		}
		if (isNaN(endBeat)) {
			throw 'NoteManager - getIndexesStartingBetweenBeatInterval - endBeat must be a positive integer ' + endBeat;
		}
		var index1 = this.getNextIndexNoteByBeat(startBeat);
		var index2;
		if (endBeat > this.getTotalDuration()  || endBeat == null){ // important ==, to be true if null or undefined
			index2 = ifExactExclude ? this.getTotal() - 1 : this.getTotal();
		}else{
			index2 = this.getPrevIndexNoteByBeat(endBeat, ifExactExclude); //ifExactExclude is true, that means that we wont return note starting exactly at endBeat
		}
		return [index1, index2];
	};

	
	NoteManager.prototype.fillGapWithRests = function(durations) {
		var rests = [], 
			silenceDurs = [],
			self = this;
		
		if (!Array.isArray(durations)){
			durations = [durations];
		}
		
		durations.forEach(function(duration){
			silenceDurs = NoteUtils.durationToNotes(duration);
			if (silenceDurs[0] !== undefined){
				silenceDurs.forEach(function(dur) {
					newNote = new NoteModel(dur + 'r');
					self.addNote(newNote);	
				});
			}
		});
	};
	NoteManager.prototype.onlyRests = function() {
		
		for (var i = 0; i < this.notes.length; i++) {
			if (!this.notes[i].isRest){
				return false;
			}
		}
		return true;
	};
	
	/**
	 * This function is called in a temporal NoteManager with selected notes in a time signature change (from StructureEditionController) 
	 * so notes are adapted to only one time signature (no time signature changes)
	 * @param  {TimeSignatureModel} timeSig 
	 * @param  {integer} numBars number of bars to change, used when there are only rests, when there are notes, numBars can be undefined
	 * @return {Array}         of NoteModel
	 */
	NoteManager.prototype.getNotesAdaptedToTimeSig = function(timeSig,numBars) {
		var newNoteMng = new NoteManager();
		var numBeatsBar = timeSig.getQuarterBeats();
		
		var i;
		if (this.onlyRests()){
			var divisions = [];
			for (i = 0; i < numBars; i++) {
				divisions.push(timeSig.getQuarterBeats());
			}
			newNoteMng.fillGapWithRests(divisions);
		}
		else{
			var accDuration = 0; //accumulated Duration
			var note, newNote;
			for (i = 0; i < this.notes.length; i++) {
				note = this.notes[i];
				accDuration += note.getDuration();
				if (roundBeat(accDuration) == numBeatsBar && i < this.notes.length - 1){
					accDuration = 0;
					newNoteMng.addNote(note);
				}else if(roundBeat(accDuration) > numBeatsBar){
					var diff = roundBeat(accDuration) - numBeatsBar;
					note.setDurationByBeats(note.getDuration() - diff);
					note.setTie('start');
					newNoteMng.addNote(note);
					newNote = note.clone();
					newNote.setDurationByBeats(diff);
					
					newNote.removeTie();
					newNote.setTie('stop');
					newNoteMng.addNote(newNote);

					accDuration = diff;

				}else{
					newNoteMng.addNote(note);	
				}
			}
			var startingBeat = newNoteMng.getTotalDuration() + 1; //beat is 1 based
			var gapDuration = numBeatsBar - accDuration;
			newNoteMng.fillGapWithRests(gapDuration);
		}
		return newNoteMng.getNotes();
	};
	/**
	 * if there are ties that with different pitches, we remove the tie
	 */
	NoteManager.prototype.reviseTiesPitch = function() {
		var notes = this.notes;
		var note, notes2;
		for (var i = 0; i < notes.length - 1; i++) {
			note = notes[i];
			note2 = notes[i + 1];
			if (note.isTie('start') && note2.isTie('stop') && note.getPitch() != note2.getPitch()) {
				note.removeTie(note.getTie());
				note2.removeTie(note2.getTie());
			}
		}
	};
	NoteManager.prototype.findRestAreas = function(pos) {
		start = pos[0];
		end = pos[1];
		var startPos, endPos;
		var iLeft;
		var iRight;

		var outerLeftArea = null;
		if (start > 0){
			iLeft = start - 1;
			if(this.notes[iLeft].isRest){
				outerLeftArea = [];
				outerLeftArea[1] = iLeft;
				while (iLeft >= 0 && this.notes[iLeft].isRest){
					outerLeftArea[0] = iLeft;
					iLeft--;
				}		
			}
			
		}
		
		var outerRightArea = null;
		if (end < this.getTotal() - 1){
			iRight = end + 1;	
			if (this.notes[iRight].isRest){
				outerRightArea = [];
				outerRightArea[0] = iRight;
				while (iRight < this.getTotal() && this.notes[iRight].isRest){
					outerRightArea[1] = iRight;
					iRight++;
				}
			}
		}
		
		
		var innerLeftArea = null;
		iLeft = start;
		if (this.notes[iLeft].isRest){
			innerLeftArea = [];
			innerLeftArea[0] = iLeft;
			while(iLeft <= end && this.notes[iLeft].isRest){
				innerLeftArea[1] = iLeft;
				iLeft++;
			}

		}

		var innerRightArea = null;
		iRight = end;
		var limit = innerLeftArea ? innerLeftArea[1] : start;
		if(this.notes[iRight].isRest && iRight > limit){
			innerRightArea = [];
			innerRightArea[1] = iRight;
			while(iRight > limit && this.notes[iRight].isRest){
				innerRightArea[0] = iRight;
				iRight--;	
			}
		}
		// console.log(outerLeftArea);
		// console.log(innerLeftArea);
		// console.log(innerRightArea);
		// console.log(outerRightArea);
		
		var leftArea;
		if (outerLeftArea && innerLeftArea && outerLeftArea[1] == innerLeftArea[0] - 1){
			leftArea = [outerLeftArea[0], innerLeftArea[1]];	
		}
		else{
			leftArea = outerLeftArea || innerLeftArea;
		}
		
		var rightArea;
		if (outerRightArea && innerRightArea && innerRightArea[1] == outerRightArea[0] - 1){
			rightArea = [innerRightArea[0], outerRightArea[1]];	
		}
		else{
			rightArea = innerRightArea || outerRightArea;
		}

		if (leftArea && rightArea){
			if  (leftArea[1] == rightArea[0] - 1){
				return [
					[leftArea[0], rightArea[1]]
				];
			}else{
				return [
					leftArea,
					rightArea
				];
			}
		}
		else{
			return leftArea ? [leftArea] : rightArea ? [rightArea] : null;
		}
	};

	/**
	 * this function is called after deleting a note or copy and pasting notes, to check if there is a malformed tuplet or a malformed tie
	 * if it does, it deletes the tie or the tuplet
	 * @return {[type]} [description]
	 */
	NoteManager.prototype.reviseNotes = function() {

		function getRemoveSet(input, i) {
			var min = i;
			var max = i;
			while (min > 0 && input[min - 1] != "no") {
				min--;
			}
			while (max + 1 < input.length && input[max + 1] != "no") {
				max++;
			}
			return {
				min: min,
				max: max
			};
		}

		/**
		 * This function parses input controling that all transitions are valid,
		 * if it finds a problem, removes the property that causes the error
		 *
		 * @param  {Array of NoteModel} notes          notes to modify
		 * @param  {Object} graph          tranistion graph represents valid transitions
		 * @param  {Array}  input          array of states, taken from notes
		 * @param  {[type]} removeFunction function to remove property
		 */
		function parser(notes, graph, input, removeFunction) {
			var prevState, currState;
			var isTie = [];
			var states = Object.keys(graph);
			var iToStartRemoving;
			var intervalsToRemove = [];
			for (var i = 0; i < input.length; i++) {
				prevState = (i < 1) ? "no" : input[i - 1];
				currState = (i == input.length) ? "no" : input[i];
				if ($.inArray(prevState, states) == -1) {
					throw "value " + prevState + "(position " + i + ") not specified on transitions graph";
				}
				if ($.inArray(currState, graph[prevState]) == -1) {
					var iToStartRemove = (currState == "no") ? i - 1 : i;
					intervalsToRemove.push(getRemoveSet(input, iToStartRemove));
				}
			}

			var max, min;
			for (var i in intervalsToRemove) {
				max = intervalsToRemove[i].max;
				min = intervalsToRemove[i].min;

				for (var j = min; j <= max; j++) {
					NoteModel.prototype[removeFunction].call(notes[j], notes[j].tie);
				}
			}

		}

		function checkTuplets(notes) {
			var note;
			var states = [];
			var state;
			for (var i = 0; i < notes.length; i++) {
				note = notes[i];
				state = note.getTuplet() || "no";
				states.push(state);
			}
			parser(notes, {
					"no": ["no", "start"],
					"start": ["middle"],
					"middle": ["stop"],
					"stop": ["start", "no"]
				}, states,
				"removeTuplet"
			);
		}

		function checkTies(notes) {
			var note;
			var states = [];
			var state;
			for (var i = 0; i < notes.length; i++) {
				note = notes[i];
				state = note.getTie() || "no";
				states.push(state);
			}
			parser(notes, {
					"no": ["no", "start"],
					"start": ["stop", "stop_start"],
					"stop_start": ["stop", "stop_start"],
					"stop": ["start", "no"]
				}, states,
				"removeTie"
			);

		}
		checkTuplets(this.notes);
		checkTies(this.notes);
	};


	/**
	 * private function for rounding beats
	 * we round to avoid problems with triplet as 12.9999999 is less than 13 and that would not work
	 * @return {[type]} [description]
	 */
	function roundBeat(beat) {
		return Math.round(beat * 1000000) / 1000000;
	}

	

	return NoteManager;
});