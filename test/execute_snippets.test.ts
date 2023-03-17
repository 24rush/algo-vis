import { suite, test } from '@testdeck/mocha';
import { expect } from 'chai';

import { OperationRecorder } from '../src/operation-recorder'

@suite class ExecuteSnippets {

    private opRec: OperationRecorder = new OperationRecorder();

    before() {
    }

    @test 'should do something when call a method'() {
        var goodFn = function () { };

        expect(goodFn).to.not.throw(); // Recommended
    }

}