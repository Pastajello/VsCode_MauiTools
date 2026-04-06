import assert from 'assert';

import {
    extractBindings,
    generateBindableProperties,
    extractXmlns,
    generateXaml,
    generateCodeBehind
} from '../src/core/extractLogic';

describe('XAML Extract Logic', () => {

    // =========================
    // BINDINGS
    // =========================

    it('should extract simple bindings', () => {

        const input = `
            <Label Text="{Binding Title}" />
            <Label Text="{Binding Details.Description}" />
        `;

        const result = extractBindings(input);

        assert.deepStrictEqual(result, ['Title', 'Description']);
    });

    it('should extract last segment from deep binding', () => {

        const input = `{Binding A.B.C}`;

        const result = extractBindings(input);

        assert.deepStrictEqual(result, ['C']);
    });

    it('should ignore duplicates', () => {

        const input = `
            <Label Text="{Binding Title}" />
            <Label Text="{Binding Title}" />
        `;

        const result = extractBindings(input);

        assert.deepStrictEqual(result, ['Title']);
    });

    it('should ignore complex bindings (RelativeSource)', () => {

        const input = `
            <Label Text="{Binding Source={RelativeSource AncestorType=ContentPage}, Path=Title}" />
        `;

        const result = extractBindings(input);

        assert.deepStrictEqual(result, []);
    });

    // =========================
    // BINDABLE PROPERTIES
    // =========================

    it('should generate bindable properties', () => {

        const result = generateBindableProperties(['Title'], 'MyControl');

        assert.ok(result.includes('TitleProperty'));
        assert.ok(result.includes('typeof(object)'));
        assert.ok(result.includes('public object Title'));
    });

    it('should return empty string if no bindings', () => {

        const result = generateBindableProperties([], 'MyControl');

        assert.strictEqual(result, '');
    });

    // =========================
    // XMLNS
    // =========================

    it('should extract xmlns correctly', () => {

        const selected = `<local:MyView />`;

        const doc = `
            xmlns:local="clr-namespace:App.Views"
        `;

        const { extraXmlns, missingPrefixes } = extractXmlns(selected, doc);

        assert.ok(extraXmlns.includes('xmlns:local="clr-namespace:App.Views"'));
        assert.strictEqual(missingPrefixes.length, 0);
    });

    it('should detect missing xmlns', () => {

        const selected = `<vm:MyView />`;

        const doc = `
            xmlns:local="clr-namespace:App.Views"
        `;

        const { missingPrefixes } = extractXmlns(selected, doc);

        assert.deepStrictEqual(missingPrefixes, ['vm']);
    });

    it('should ignore x: prefix', () => {

        const selected = `<x:Type />`;

        const doc = `
            xmlns:x="http://schemas.microsoft.com/winfx/2009/xaml"
        `;

        const { extraXmlns, missingPrefixes } = extractXmlns(selected, doc);

        assert.strictEqual(extraXmlns.trim(), '');
        assert.strictEqual(missingPrefixes.length, 0);
    });

    // =========================
    // XAML GENERATION
    // =========================

    it('should generate valid XAML', () => {

        const result = generateXaml(
            'App.Controls.MyControl',
            '<Label />',
            '\n             xmlns:local="test"'
        );

        assert.ok(result.includes('<ContentView'));
        assert.ok(result.includes('x:Class="App.Controls.MyControl"'));
        assert.ok(result.includes('xmlns:local="test"'));
        assert.ok(result.includes('<Label />'));
    });

    // =========================
    // CODE BEHIND
    // =========================

    it('should generate code-behind with properties', () => {

        const props = generateBindableProperties(['Title'], 'MyControl');

        const result = generateCodeBehind('App.Controls', 'MyControl', props);

        assert.ok(result.includes('namespace App.Controls'));
        assert.ok(result.includes('partial class MyControl'));
        assert.ok(result.includes('InitializeComponent()'));
        assert.ok(result.includes('TitleProperty'));
    });

});
