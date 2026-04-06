import assert from 'assert';

import {
    extractBindings,
    generateBindableProperties,
    extractXmlns,
    generateXaml,
    generateCodeBehind,
    resolveNamespacePrefix,
    generateControlUsage
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
        assert.deepStrictEqual(result, [
            { prop: 'Title', path: 'Title' },
            { prop: 'Subtitle', path: 'Subtitle' }
        ]);
    });

    it('should handle multiline binding', () => {
        const input = `
            <Label Text="{
                Binding Title
            }" />
        `;
        const result = extractBindings(input);
        assert.deepStrictEqual(result, [
            { prop: 'Title', path: 'Title' }
        ]);
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
        assert.deepStrictEqual(result, [
            { prop: 'Name', path: 'Details.Items.Name' }
        ]);
    });

    // =========================
    // NULL SAFE
    // =========================

    it('should support null-safe operator', () => {
        const input = `{Binding Details?.Name}`;
        const result = extractBindings(input);
        assert.deepStrictEqual(result, [
            { prop: 'Name', path: 'Details.Name' }
        ]);
    });

    // =========================
    // CONVERTER
    // =========================

    it('should support Converter', () => {
        const input = `{Binding Title, Converter={StaticResource MyConverter}}`;
        const result = extractBindings(input);
        assert.deepStrictEqual(result, [
            { prop: 'Title', path: 'Title' }
        ]);
    });

    // =========================
    // STRING FORMAT
    // =========================

    it('should support StringFormat', () => {
        const input = `{Binding Path=Title, StringFormat='{}Hello {0}'}`;
        const result = extractBindings(input);
        assert.deepStrictEqual(result, [
            { prop: 'Title', path: 'Title' }
        ]);
    });

    // =========================
    // RELATIVE SOURCE
    // =========================

    it('should support RelativeSource with Path', () => {
        const input = `{Binding Source={RelativeSource AncestorType=ContentPage}, Path=Title}`;
        const result = extractBindings(input);
        assert.deepStrictEqual(result, [
            { prop: 'Title', path: 'Title' }
        ]);
    });

    it('should support x:Reference with Path', () => {
        const input = `{Binding Source={x:Reference myView}, Path=Title}`;
        const result = extractBindings(input);
        assert.deepStrictEqual(result, [
            { prop: 'Title', path: 'Title' }
        ]);
    });

    // =========================
    // PATH
    // =========================

    it('should support Path=Title', () => {
        const input = `{Binding Path=Title}`;
        const result = extractBindings(input);
        assert.deepStrictEqual(result, [
            { prop: 'Title', path: 'Title' }
        ]);
    });

    it('should support Path with nested property', () => {
        const input = `{Binding Path=Details.Description}`;
        const result = extractBindings(input);
        assert.deepStrictEqual(result, [
            { prop: 'Description', path: 'Details.Description' }
        ]);
    });

    // =========================
    // PARAMETERS
    // =========================

    it('should support binding with Mode', () => {
        const input = `{Binding Title, Mode=TwoWay}`;
        const result = extractBindings(input);
        assert.deepStrictEqual(result, [
            { prop: 'Title', path: 'Title' }
        ]);
    });

    it('should support binding with multiple parameters', () => {
        const input = `{Binding Details.Description, Mode=OneWay}`;
        const result = extractBindings(input);
        assert.deepStrictEqual(result, [
            { prop: 'Description', path: 'Details.Description' }
        ]);
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

        assert.deepStrictEqual(result, [
            { prop: 'Title', path: 'Title' },
            { prop: 'Description', path: 'Details.Description' }
        ]);
    });

    it('should extract last segment from deep binding', () => {

        const input = `{Binding A.B.C}`;

        const result = extractBindings(input);

        assert.deepStrictEqual(result, [
            { prop: 'C', path: 'A.B.C' }
        ]);
    });

    it('should ignore duplicates', () => {

        const input = `
            <Label Text="{Binding Title}" />
            <Label Text="{Binding Title}" />
        `;

        const result = extractBindings(input);

        assert.deepStrictEqual(result, [
            { prop: 'Title', path: 'Title' }
        ]);
    });

    // =========================
    // BINDABLE PROPERTIES
    // =========================

    it('should generate bindable properties', () => {

        const result = generateBindableProperties(
            [{ prop: 'Title', path: 'Title' }],
            'MyControl'
        );

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

        const props = generateBindableProperties(
            [{ prop: 'Title', path: 'Title' }],
            'MyControl'
        );

        const result = generateCodeBehind('App.Controls', 'MyControl', props);

        assert.ok(result.includes('namespace App.Controls'));
        assert.ok(result.includes('partial class MyControl'));
        assert.ok(result.includes('InitializeComponent()'));
        assert.ok(result.includes('TitleProperty'));
    });

    // =========================
    // NAMESPACE PREFIX
    // =========================


    describe('Namespace Prefix Resolution', () => {

        it('should generate prefix from last namespace segment', () => {

            const { prefix } = resolveNamespacePrefix(
                'Sample.Controls',
                ''
            );

            assert.strictEqual(prefix, 'controls');
        });

        it('should reuse existing namespace prefix', () => {

            const extra = `xmlns:controls="clr-namespace:Sample.Controls"`;

            const result = resolveNamespacePrefix(
                'Sample.Controls',
                extra
            );

            assert.strictEqual(result.prefix, 'controls');
            assert.strictEqual(result.xmlnsToAdd, '');
        });

        it('should increment prefix if already used', () => {

            const extra = `
            xmlns:controls="clr-namespace:Sample.Controls"
            xmlns:controls1="clr-namespace:Sample.Views.Controls"
        `;

            const result = resolveNamespacePrefix(
                'Sample.Other.Controls',
                extra
            );

            assert.strictEqual(result.prefix, 'controls2');
        });

        it('should handle same suffix from different namespaces', () => {

            const extra = `
            xmlns:controls="clr-namespace:Sample.Controls"
        `;

            const result = resolveNamespacePrefix(
                'Another.Controls',
                extra
            );

            assert.strictEqual(result.prefix, 'controls1');
        });

    });

    // =========================
    // XAML + DATATYPE
    // =========================

    describe('XAML with DataType', () => {

        it('should generate xaml with x:DataType', () => {

            const result = generateXaml(
                'Sample.Controls.MyControl',
                '<Label />',
                ''
            );

            assert.ok(result.includes('x:DataType="controls:MyControl"'));
            assert.ok(result.includes('xmlns:controls="clr-namespace:Sample.Controls"'));
        });

        it('should not duplicate xmlns for same namespace', () => {

            const extra = `
            xmlns:controls="clr-namespace:Sample.Controls"
        `;

            const result = generateXaml(
                'Sample.Controls.MyControl',
                '<Label />',
                extra
            );

            const count = (result.match(/xmlns:controls/g) || []).length;

            assert.strictEqual(count, 1);
        });

    });

    // =========================
    // CONTROL USAGE (BINDINGS TRANSFER)
    // =========================

    describe('Control Usage Generation', () => {

        it('should generate control usage with bindings', () => {

            const usage = generateControlUsage(
                'controls',
                'MyControl',
                [
                    { prop: 'Title', path: 'Title' },
                    { prop: 'Description', path: 'Details.Description' }
                ]
            );

            assert.ok(usage.includes('<controls:MyControl'));
            assert.ok(usage.includes('Title="{Binding Title}"'));
            assert.ok(usage.includes('Description="{Binding Details.Description}"'));
        });

        it('should generate self-closing control when no bindings', () => {

            const usage = generateControlUsage(
                'controls',
                'MyControl',
                []
            );

            assert.strictEqual(usage.trim(), '<controls:MyControl />');
        });

    });


});
