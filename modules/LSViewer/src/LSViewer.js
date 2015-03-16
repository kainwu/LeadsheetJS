define([
		'vexflow',
		'modules/LSViewer/src/LSNoteView',
		'modules/LSViewer/src/LSChordView',
		'modules/LSViewer/src/LSBarView',
		'modules/LSViewer/src/BeamManager',
		'modules/LSViewer/src/TieManager',
		'modules/LSViewer/src/TupletManager',
		'modules/LSViewer/src/BarWidthManager',
		'modules/core/src/SectionBarsIterator',
		'modules/core/src/SongBarsIterator',
		'pubsub'
	],
	function(Vex, LSNoteView, LSChordView, LSBarView, BeamManager, TieManager, TupletManager, BarWidthManager, SectionBarsIterator, SongBarsIterator, pubsub) {


		function LSViewer(divContainer, params) {
			this.el = divContainer;
			this.init(divContainer, params);
			this.drawableModel = [];
			this.initController();
		}

		/**
		 * [LSViewer description]
		 * @param {domObject} jQuery divContainer ; e.g.: $("#divContainerId");
		 * @param {Object} params 	possible params:
		 *                        	- heightOverflow: "scroll" | "auto"; default: "auto"
		 *                        		If scroll, when canvas is larger than containing div, it will scroll, if not, it will change div width
		 *                        	- typeResize: "scale" | "fluid"; default: "fluid"
		 *                        		If scale, when canvas is wider than containing div, it will scale to fit; if "fluid" it will try to fit withouth scaling.
		 *                        	//TODO: possibility of combining both (scale partially and then fluid)
		 */
		function LSViewer(divContainer, params) {
				this.init(divContainer, params);
				this.drawableModel = [];
				this.initController();
			}
			/**
			 * Create and return a dom element
			 */
		LSViewer.prototype._createCanvas = function(idScore, width, height, divContainer) {
			var canvas = $("<canvas id='" + idScore + "'></canvas>");
			canvas[0].width = width;
			canvas[0].height = height;
			canvas.appendTo(divContainer);
			var divCss = {
				textAlign: "center"
			};

			divContainer.css(divCss);
			return canvas[0];
		};
		/**
		 * Publish event after receiving dom events
		 */
		LSViewer.prototype.initController = function() {
			var self = this;


			$(this.canvas).click(function(evt) {
				$.publish('LSViewer-click', getXandY($(self.canvas), evt));
			});
			$(this.canvas).mousemove(function(evt) {
				$.publish('LSViewer-mouseover', getXandY($(self.canvas), evt));
			});

			function getXandY(element, event) {
				xpos = event.pageX - element.offset().left;
				ypos = event.pageY - element.offset().top;
				return {
					x: xpos,
					y: ypos
				};
			}
		};

		LSViewer.prototype.init = function(divContainer, params) {
			params = params || {};
			this.DEFAULT_HEIGHT = 1000;
			this.SCALE = 0.999;
			this.CANVAS_DIV_WIDTH_PROPORTION = 0.8; //width proportion between canvas created and divContainer

			this.NOTE_WIDTH = 20; /* estimated note width in order to be more flexible */
			this.LINE_HEIGHT = 150;
			this.LINE_WIDTH = 1160;
			this.BARS_PER_LINE = 4;
			this.ENDINGS_Y = 20; //0 -> thisChordsPosY==40, the greater the closer to stave 
			this.LABELS_Y = 0; //like this.ENDINGS_Y
			this.MARGIN_TOP = 100;
			this.CHORDS_DISTANCE_STAVE = 20; //distance from stave

			this.heightOverflow = params.heightOverflow || "auto";
			this.divContainer = divContainer;


			var idScore = "ls" + ($("canvas").length + 1),
				width = divContainer.width() * this.CANVAS_DIV_WIDTH_PROPORTION;

			this.canvas = this._createCanvas(idScore, width, this.DEFAULT_HEIGHT, divContainer);
			var renderer = new Vex.Flow.Renderer(this.canvas, Vex.Flow.Renderer.Backends.CANVAS);
			this.ctx = renderer.getContext("2d");

			if (params.typeResize == 'scale') {
				this.SCALE = (width / this.LINE_WIDTH) * 0.95;
			} else { // typeResize == 'fluid'
				this._setWidth(width);
			}
		};

		LSViewer.prototype._setWidth = function(width) {
			var viewerWidth = width || this.LINE_WIDTH;
			this.LINE_WIDTH = viewerWidth;
		};

		/**
		 * Add a model that contains a draw function, this function will be called in the draw function
		 * @param {object} model  should contain a draw function that will be call
		 * @param {int} zIndex Notes and chords are on zIndex 10, if you want to draw before then use zIndex < 10 or after use z index > 10
		 */
		LSViewer.prototype.addDrawableModel = function(model, zIndex) {
			if (typeof model === "undefined") {
				return;
			}
			if (typeof zIndex === "undefined") {
				zIndex = 11; // default value
			}
			this.drawableModel.push({
				'elem': model,
				'zIndex': zIndex
			});
			this.sortDrawableModel();
		};

		LSViewer.prototype.removeDrawableModel = function(model) {
			for (var i = 0, c = this.drawableModel.length; i < c; i++) {
				if (this.drawableModel[i].elem === model) {
					this.drawableModel[i].slice(i, 1);
					return;
				}
			}
		};

		LSViewer.prototype.sortDrawableModel = function(model, zIndex) {
			this.drawableModel.sort(function(a, b) {
				if (a.zIndex < b.zIndex)
					return -1;
				if (a.zIndex > b.zIndex)
					return 1;
				return 0;
			});
		};

		LSViewer.prototype._scale = function() {
			this.ctx.scale(this.SCALE, this.SCALE);
			//	this.ctx.translate((this.ctx.canvas.width * (1 -  this.SCALE)/2) , 0);
		};

		LSViewer.prototype._resetScale = function() {
			//	this.ctx.translate(-(this.ctx.canvas.width * (1 -  this.SCALE)/2) , 0);
			this.ctx.scale(1 / this.SCALE, 1 / this.SCALE);
		};
		LSViewer.prototype.setHeight = function(song,barWidthMng) {
			var totalNumBars = song.getComponent("bars").getTotal();
			this.canvas.height = (barWidthMng.getDimensions(totalNumBars - 1).top + this.LINE_HEIGHT) * this.SCALE;
			if (this.canvas.height > this.divContainer.height() && this.heightOverflow == 'scroll') {
				this.divContainer.css({
					overflowY: "scroll"
				});
			}else{
				this.divContainer.height(this.canvas.height);
			}

		};
		/**
		 * function useful to be called in 'draw' function between this._scale() and this._resetScale().
		 * It takes the width without taking into account we are scaling. This way we can place elements correctly (e.g. centering the title)
		 */
		LSViewer.prototype._getNonScaledWidth = function() {
			return this.canvas.width / this.SCALE;
		};
		LSViewer.prototype.draw = function(song) {
			//console.time('whole draw');

			var i, j, v, c;

			var numBar = 0,
				self = this,
				nm = song.getComponent("notes"),
				cm = song.getComponent("chords"),
				barNotes,
				barChords,
				beamMng,
				tupletMng,
				bar,
				noteView,
				chordView,
				iNote = 0,
				stave,
				vxfBeams,
				vxfNote,
				vxfNotes = [],
				vxfBars = [],
				barDimensions,
				tieMng = new TieManager();

			var barWidthMng = new BarWidthManager(this.LINE_HEIGHT, this.LINE_WIDTH, this.NOTE_WIDTH, this.BARS_PER_LINE, this.MARGIN_TOP);
			barWidthMng.calculateBarsStructure(song, nm);
			this.setHeight(song, barWidthMng);
			// call drawable elem with zIndex < 10
			for (i = 0, c = this.drawableModel.length; i < c; i++) {
				if (this.drawableModel[i].zIndex < 10 && typeof this.drawableModel[i].elem.draw === "function") {
					this.drawableModel[i].elem.draw(self);
				}
			}

			var numSection = 0;
			var songIt = new SongBarsIterator(song);
			var barView;
			var sectionIt;
			this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);


			this._scale();
			song.getSections().forEach(function(section) {

				// for each bar
				sectionIt = new SectionBarsIterator(section);
				while (sectionIt.hasNext()) {
					//console.time('whole bar');
					//console.log(sectionIt.getBarIndex());

					beamMng = new BeamManager();
					tupletMng = new TupletManager();
					bar = [];
					//console.time('getNotes');
					barNotes = nm.getNotesAtBarNumber(songIt.getBarIndex(), song);
					//console.timeEnd('getNotes');

					//console.time('drawNotes');
					// for each note of bar
					for (j = 0, v = barNotes.length; j < v; j++) {
						tieMng.checkTie(barNotes[j], iNote);
						tupletMng.checkTuplet(barNotes[j], iNote);
						noteView = new LSNoteView(barNotes[j]);
						beamMng.checkBeam(nm, iNote, noteView);
						vxfNote = noteView.getVexflowNote();
						bar.push(vxfNote);
						vxfNotes.push(vxfNote);
						iNote++;
					}
					//console.timeEnd('drawNotes');

					barDimensions = barWidthMng.getDimensions(songIt.getBarIndex());
					barView = new LSBarView(barDimensions);
					//console.time('drawBars');
					barView.draw(self.ctx, songIt, sectionIt, self.ENDINGS_Y, self.LABELS_Y);
					//console.timeEnd('drawBars');

					vxfBars.push({
						'barDimensions': barDimensions,
						'timeSignature': songIt.getBarTimeSignature(),
					});

					//console.time('getChords');
					barChords = cm.getChordsByBarNumber(songIt.getBarIndex());
					for (i = 0, c = barChords.length; i < c; i++) {
						chordView = new LSChordView(barChords[i]).draw(
							self.ctx,
							barDimensions,
							songIt.getBarTimeSignature(),
							self.CHORDS_DISTANCE_STAVE
						);
					}
					//console.timeEnd('getChords');

					//console.time('beams');
					vxfBeams = beamMng.getVexflowBeams(); // we need to do getVexflowBeams before drawing notes
					//console.timeEnd('beams');

					//console.time('stave');
					Vex.Flow.Formatter.FormatAndDraw(self.ctx, barView.getVexflowStave(), bar, {
						autobeam: false
					});
					//console.timeEnd('stave');

					//console.time('draw');
					beamMng.draw(self.ctx, vxfBeams); // and draw beams needs to be done after drawing notes
					tupletMng.draw(self.ctx, vxfNotes);
					//console.timeEnd('draw');

					songIt.next();
					sectionIt.next();
					//console.timeEnd('whole bar');
				}
				numSection++;
			});
			tieMng.draw(this.ctx, vxfNotes, nm, barWidthMng, song);
			this.vxfNotes = vxfNotes;
			this.vxfBars = vxfBars;
			//this.lastDrawnSong = song;

			// call drawable elem with zIndex > 10
			for (i = 0, c = this.drawableModel.length; i < c; i++) {
				if (this.drawableModel[i].zIndex >= 10 && typeof this.drawableModel[i].elem.draw === "function") {
					this.drawableModel[i].elem.draw(self);
				}
			}
			this.ctx.fillStyle = "black";
			this.ctx.strokeStyle = "black";
			var oldTextAlign = this.ctx.textAlign;
			this.ctx.textAlign = 'right';
			this.ctx.font = "24px lato Verdana";
			this.ctx.fillText(song.getComposer(), 1175, 20, 1200);
			this.ctx.textAlign = 'center';
			this.ctx.font = "32px lato Verdana";
			this.ctx.fillText(song.getTitle(), this._getNonScaledWidth()/2, 60, this._getNonScaledWidth());
			this.ctx.textAlign = oldTextAlign;
			this._resetScale();
			//console.timeEnd('whole draw');
			$.publish('LSViewer-drawEnd', this);
		};
		return LSViewer;

	});