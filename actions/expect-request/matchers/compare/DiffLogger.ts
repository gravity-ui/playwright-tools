import type { DiffContextItem, DiffItemBase, DiffLog } from './constants';

export class DiffLogger {
    private context: DiffContextItem[] = [];
    private _diffLog: DiffLog = [];

    get diffLog() {
        return this._diffLog;
    }

    addDiffItem(diffItem: DiffItemBase) {
        this.diffLog.push({ ...diffItem, context: [...this.context] });
    }

    addContext(context: DiffContextItem) {
        this.context.push(context);
    }

    removeContext() {
        this.context.pop();
    }
}
