'use babel';

import fs from 'fs';
import AppAtomView from './1984-atom-view';
import { CompositeDisposable } from 'atom';

export default {

  decorations: [],
  AppAtomView: null,
  modalPanel: null,
  subscriptions: null,
  coverageFilePath: '',
  coverageFilename: '1984-coverage.json',
  _this: this,
  watching: false,

  activate(state) {
    this.AppAtomView = new AppAtomView(state.AppAtomViewState);
    this.modalPanel = atom.workspace.addModalPanel({
      item: this.AppAtomView.getElement(),
      visible: false
    });

    this.findCoverageFile(
      this.updateEditorCoverage.bind(this)
    );
    
    // Events subscribed to in atom's system can be easily cleaned up with a CompositeDisposable
    this.subscriptions = new CompositeDisposable();

    // Register command that toggles this view
    this.subscriptions.add(atom.commands.add('atom-workspace', {
      '1984-atom:toggle': () => this.enable()
    }));
  },

  deactivate() {
    this.modalPanel.destroy();
    this.subscriptions.dispose();
    this.AppAtomView.destroy();
  },

  serialize() {
    return {
      AppAtomViewState: this.AppAtomView.serialize()
    };
  },

  enable() {
    this.findCoverageFile(this.updateEditorCoverage.bind(this));
  },
  
  findCoverageFile(callback, filepath) {
    if (typeof filepath === 'undefined') {
      const editor = atom.workspace.getActiveTextEditor();
      const activeFilePath = editor.getPath(); 
      const filePathParts = activeFilePath.split('/');
      filePathParts.pop();
      filepath = filePathParts.join('/');
    }
    
    const searchPath = filepath + '/' + this.coverageFilename;
    fs.readFile(searchPath, (err, data) => {
      const searchPathParts = filepath.split('/');
      if (err && searchPathParts.length > 0) {
        searchPathParts.pop();
        const nextSearchPath = searchPathParts.join('/');
        this.findCoverageFile(callback, nextSearchPath);
      }
      else {
        callback(searchPath);
      }
    });  
  },  
  
  updateEditorCoverage(coverageFilePath) {
    const watchOptions = { persistent: true, interval: 1000 };
    
    if(!this.watching) {
      fs.watchFile(coverageFilePath, watchOptions, () => {
          this.enable();
      });
      this.watching = true;
    }
    
    console.log(this.watching, 'watching?');
    
    const editor = atom.workspace.getActiveTextEditor();
    editor.getDecorations().forEach(d => d.destroy());
    
    console.log(coverageFilePath, 'found coverage file');
    const coverageFile = fs.readFileSync(coverageFilePath);
    const coverage = JSON.parse(coverageFile);  
  
    coverage.forEach(report => {
      const lineColor = (report.coverageStatus === 'pass') ? 'green' : 'red';
      const lineStart = report.coveringTest.start - 1;
      const lineEnd = report.coveringTest.end - 1;
      const marker = editor.markBufferRange([[lineStart, lineStart], [lineEnd, lineEnd]]);
      const decoration = editor.decorateMarker(marker, {type: 'line-number', class: `line-number-${lineColor}`})
    });
  }
};
