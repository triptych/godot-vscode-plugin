import * as vscode from 'vscode';
import DocDataManager from './docdata';
import godotRequest from './request';
import GDScriptSymbolProvider from './gdscript/symbolprovider';
import GDScriptWorkspaceSymbolProvider from './gdscript/workspace_symbol_provider';
var glob = require("glob")
import config from './config';

class ToolManager {

  private workspaceDir: string = "";
  private docs: DocDataManager = null;
  private symbolprovider: GDScriptSymbolProvider = null;
  private workspacesymbolprovider: GDScriptWorkspaceSymbolProvider = null;
  private _disposable: vscode.Disposable;

  constructor(context: vscode.ExtensionContext) {
    this.workspaceDir = vscode.workspace.rootPath.replace(/\\/g, "/");
    this.validate();
    this.loadWorkspaceSymbols();
    this.docs = new DocDataManager(context.extensionPath);
    this.symbolprovider = new GDScriptSymbolProvider();
    vscode.languages.registerDocumentSymbolProvider('gdscript', this.symbolprovider);
    this.workspacesymbolprovider = new GDScriptWorkspaceSymbolProvider();
    vscode.languages.registerWorkspaceSymbolProvider(this.workspacesymbolprovider);

    // Commands
    this._disposable = vscode.Disposable.from(
      vscode.commands.registerCommand('godot.updateWorkspaceSymbols', this.loadWorkspaceSymbols.bind(this))
    );
  }

  validate() {
    const self = this;
    godotRequest({action: "editor", command: "projectdir"}).then((res: any)=>{
      let path = res.path;
      if(path && path.length> 0 && path.endsWith("/"))
        path = path.substring(0, path.length-1)
      if( path.toLowerCase() == self.workspaceDir.toLowerCase())
        vscode.window.showInformationMessage("Connected to godot editor server");
      else {
        vscode.window.showWarningMessage("The opened project is not same with godot editor");
      }
    }).catch(e=>{
        vscode.window.showErrorMessage("Failed connect to godot editor server");
    });
  }

  loadAllSymbols(): Promise<any> {
    const self = this;
    return new Promise((resolve, reject) => {
      glob( this.workspaceDir +"/**/*.gd", (err, files)=>{
        if(!err) {
          const symbols = {};
          for(let i=0; i< files.length; i++)
            symbols[files[i]] = config.loadSymbolsFromFile(files[i]);
          resolve(symbols);
        }
        else
          reject(err);
      });
    });
  }

  loadWorkspaceSymbols() {
    this.loadAllSymbols().then(symbols=>{
        vscode.window.showInformationMessage("Update GDScript symbols done");
        config.setAllSymbols(symbols);
    }).catch(e=>{
        vscode.window.showWarningMessage("Update GDScript symbols failed");
    });
  }

  dispose() {
    this._disposable.dispose();
  }
};

export default ToolManager;