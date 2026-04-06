import assert from 'assert';

import {
    extractBindings,
    generateBindableProperties,
    extractXmlns,
    generateXaml
} from '../src/commands/extractToControl';

describe('XAML Extract Tests', () => {

    // =========================
    // BINDINGS
    // =========================
    it('should extract simple bindings', () => {

        const input = `
            <Label Text="{Binding Title}" />
            <Label Text="{Binding Details.Description}" />
        `;

        const result = extractBindings(input);

        assert.deepStrictEqual(result, ['Title', 'Details']);
    });

    it('should ignore duplicates', () => {

        const input = `
            <Label Text="{Binding Title}" />
            <Label Text="{Binding Title}" />
        `;

        const result = extractBindings(input);

        assert.deepStrictEqual(result, ['Title']);
    });

    // =========================
    // BINDABLE PROPS
    // =========================
    it('should generate bindable properties', () => {

        const result = generateBindableProperties(['Title'], 'MyControl');

        assert.ok(result.includes('TitleProperty'));
        assert.ok(result.includes('typeof(object)'));
        assert.ok(result.includes('public object Title'));
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

        assert.ok(extraXmlns.includes('xmlns:local'));
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

    // =========================
    // XAML
    // =========================
    it('should generate valid XAML', () => {

        const result = generateXaml(
            'App.Controls.MyControl',
            '<Label />',
            '\n xmlns:local="test"'
        );

        assert.ok(result.includes('ContentView'));
        assert.ok(result.includes('x:Class="App.Controls.MyControl"'));
        assert.ok(result.includes('xmlns:local'));
    });

});
