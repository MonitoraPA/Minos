/**
 * This file is part of Minos
 *
 * Copyright (C) 2023 Giacomo Tesio <giacomo@tesio.it>
 *
 * Minos is a hack. You can use it according to the terms and
 * conditions of the Hacking License (see licenses/HACK.txt)
 */

class DisposableObserver{
    #dispositions = [];

    _whileActive(undoAction){
        this._onDeactivation(undoAction);
    }
    _onDeactivation(task){
        this.#dispositions.push(task);
    }

    _onDispose(){
        throw new Error("Not implemented.")
    }

    dispose(){
        for(const task of this.#dispositions){
            task();
        }
        this.#dispositions = [];
        this._onDispose();
    }
}

module.exports = DisposableObserver;