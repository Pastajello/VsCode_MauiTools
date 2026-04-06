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
    // MULTIPLE BINDINGS
    // =========================

    it('should extract multiple bindings', () => {
        const input = `
            <Label Text="{Binding Title}" />
            <Label Text="{Binding Subtitle}" />
        `;
        const result = extractBindings(input);
        assert.deepStrictEqual(result, ['Title', 'Subtitle']);
    });

    it('should handle multiline binding', () => {
        const input = `
            <Label Text="{
                Binding Title
            }" />
        `;
        const result = extractBindings(input);
        assert.deepStrictEqual(result, ['Title']);
    });

    // =========================
    // EDGE CASES
    // =========================

    it('should ignore empty binding', () => {
        const input = `{Binding}`;
        const result = extractBindings(input);
        assert.deepStrictEqual(result, []);
    });

    it('should ignore dot binding', () => {
        const input = `{Binding .}`;
        const result = extractBindings(input);
        assert.deepStrictEqual(result, []);
    });

    // =========================
    // INDEXERS
    // =========================

    it('should support indexer access', () => {
        const input = `{Binding Details.Items[0].Name}`;
        const result = extractBindings(input);
        assert.deepStrictEqual(result, ['Name']);
    });

    // =========================
    // NULL SAFE
    // =========================

    it('should support null-safe operator', () => {
        const input = `{Binding Details?.Name}`;
        const result = extractBindings(input);
        assert.deepStrictEqual(result, ['Name']);
    });

    // =========================
    // CONVERTER
    // =========================

    it('should support Converter', () => {
        const input = `{Binding Title, Converter={StaticResource MyConverter}}`;
        const result = extractBindings(input);
        assert.deepStrictEqual(result, ['Title']);
    });

    // =========================
    // STRING FORMAT
    // =========================

    it('should support StringFormat', () => {
        const input = `{Binding Path=Title, StringFormat='{}Hello {0}'}`;
        const result = extractBindings(input);
        assert.deepStrictEqual(result, ['Title']);
    });

    // =========================
    // RELATIVE SOURCE
    // =========================

    it('should support RelativeSource with Path', () => {
        const input = `{Binding Source={RelativeSource AncestorType=ContentPage}, Path=Title}`;
        const result = extractBindings(input);
        assert.deepStrictEqual(result, ['Title']);
    });

    it('should support x:Reference with Path', () => {
        const input = `{Binding Source={x:Reference myView}, Path=Title}`;
        const result = extractBindings(input);
        assert.deepStrictEqual(result, ['Title']);
    });

    // =========================
    // PATH
    // =========================

    it('should support Path=Title', () => {
        const input = `{Binding Path=Title}`;
        const result = extractBindings(input);
        assert.deepStrictEqual(result, ['Title']);
    });

    it('should support Path with nested property', () => {
        const input = `{Binding Path=Details.Description}`;
        const result = extractBindings(input);
        assert.deepStrictEqual(result, ['Description']);
    });

    // =========================
    // PARAMETERS
    // =========================

    it('should support binding with Mode', () => {
        const input = `{Binding Title, Mode=TwoWay}`;
        const result = extractBindings(input);
        assert.deepStrictEqual(result, ['Title']);
    });

    it('should support binding with multiple parameters', () => {
        const input = `{Binding Details.Description, Mode=OneWay}`;
        const result = extractBindings(input);
        assert.deepStrictEqual(result, ['Description']);
    });


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
