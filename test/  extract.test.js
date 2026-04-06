"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const assert_1 = __importDefault(require("assert"));
const extractLogic_1 = require("../src/core/extractLogic");
describe('XAML Extract Logic', () => {
    // =========================
    // MULTIPLE BINDINGS
    // =========================
    it('should extract multiple bindings', () => {
        const input = `
            <Label Text="{Binding Title}" />
            <Label Text="{Binding Subtitle}" />
        `;
        const result = (0, extractLogic_1.extractBindings)(input);
        assert_1.default.deepStrictEqual(result, [
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
        const result = (0, extractLogic_1.extractBindings)(input);
        assert_1.default.deepStrictEqual(result, [
            { prop: 'Title', path: 'Title' }
        ]);
    });
    // =========================
    // EDGE CASES
    // =========================
    it('should ignore empty binding', () => {
        const input = `{Binding}`;
        const result = (0, extractLogic_1.extractBindings)(input);
        assert_1.default.deepStrictEqual(result, []);
    });
    it('should ignore dot binding', () => {
        const input = `{Binding .}`;
        const result = (0, extractLogic_1.extractBindings)(input);
        assert_1.default.deepStrictEqual(result, []);
    });
    // =========================
    // INDEXERS
    // =========================
    it('should support indexer access', () => {
        const input = `{Binding Details.Items[0].Name}`;
        const result = (0, extractLogic_1.extractBindings)(input);
        assert_1.default.deepStrictEqual(result, [
            { prop: 'Name', path: 'Details.Items.Name' }
        ]);
    });
    // =========================
    // NULL SAFE
    // =========================
    it('should support null-safe operator', () => {
        const input = `{Binding Details?.Name}`;
        const result = (0, extractLogic_1.extractBindings)(input);
        assert_1.default.deepStrictEqual(result, [
            { prop: 'Name', path: 'Details.Name' }
        ]);
    });
    // =========================
    // CONVERTER
    // =========================
    it('should support Converter', () => {
        const input = `{Binding Title, Converter={StaticResource MyConverter}}`;
        const result = (0, extractLogic_1.extractBindings)(input);
        assert_1.default.deepStrictEqual(result, [
            { prop: 'Title', path: 'Title' }
        ]);
    });
    // =========================
    // STRING FORMAT
    // =========================
    it('should support StringFormat', () => {
        const input = `{Binding Path=Title, StringFormat='{}Hello {0}'}`;
        const result = (0, extractLogic_1.extractBindings)(input);
        assert_1.default.deepStrictEqual(result, [
            { prop: 'Title', path: 'Title' }
        ]);
    });
    // =========================
    // RELATIVE SOURCE
    // =========================
    it('should support RelativeSource with Path', () => {
        const input = `{Binding Source={RelativeSource AncestorType=ContentPage}, Path=Title}`;
        const result = (0, extractLogic_1.extractBindings)(input);
        assert_1.default.deepStrictEqual(result, [
            { prop: 'Title', path: 'Title' }
        ]);
    });
    it('should support x:Reference with Path', () => {
        const input = `{Binding Source={x:Reference myView}, Path=Title}`;
        const result = (0, extractLogic_1.extractBindings)(input);
        assert_1.default.deepStrictEqual(result, [
            { prop: 'Title', path: 'Title' }
        ]);
    });
    // =========================
    // PATH
    // =========================
    it('should support Path=Title', () => {
        const input = `{Binding Path=Title}`;
        const result = (0, extractLogic_1.extractBindings)(input);
        assert_1.default.deepStrictEqual(result, [
            { prop: 'Title', path: 'Title' }
        ]);
    });
    it('should support Path with nested property', () => {
        const input = `{Binding Path=Details.Description}`;
        const result = (0, extractLogic_1.extractBindings)(input);
        assert_1.default.deepStrictEqual(result, [
            { prop: 'Description', path: 'Details.Description' }
        ]);
    });
    // =========================
    // PARAMETERS
    // =========================
    it('should support binding with Mode', () => {
        const input = `{Binding Title, Mode=TwoWay}`;
        const result = (0, extractLogic_1.extractBindings)(input);
        assert_1.default.deepStrictEqual(result, [
            { prop: 'Title', path: 'Title' }
        ]);
    });
    it('should support binding with multiple parameters', () => {
        const input = `{Binding Details.Description, Mode=OneWay}`;
        const result = (0, extractLogic_1.extractBindings)(input);
        assert_1.default.deepStrictEqual(result, [
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
        const result = (0, extractLogic_1.extractBindings)(input);
        assert_1.default.deepStrictEqual(result, [
            { prop: 'Title', path: 'Title' },
            { prop: 'Description', path: 'Details.Description' }
        ]);
    });
    it('should extract last segment from deep binding', () => {
        const input = `{Binding A.B.C}`;
        const result = (0, extractLogic_1.extractBindings)(input);
        assert_1.default.deepStrictEqual(result, [
            { prop: 'C', path: 'A.B.C' }
        ]);
    });
    it('should ignore duplicates', () => {
        const input = `
            <Label Text="{Binding Title}" />
            <Label Text="{Binding Title}" />
        `;
        const result = (0, extractLogic_1.extractBindings)(input);
        assert_1.default.deepStrictEqual(result, [
            { prop: 'Title', path: 'Title' }
        ]);
    });
    // =========================
    // BINDABLE PROPERTIES
    // =========================
    it('should generate bindable properties', () => {
        const result = (0, extractLogic_1.generateBindableProperties)([{ prop: 'Title', path: 'Title' }], 'MyControl');
        assert_1.default.ok(result.includes('TitleProperty'));
        assert_1.default.ok(result.includes('typeof(object)'));
        assert_1.default.ok(result.includes('public object Title'));
    });
    it('should return empty string if no bindings', () => {
        const result = (0, extractLogic_1.generateBindableProperties)([], 'MyControl');
        assert_1.default.strictEqual(result, '');
    });
    // =========================
    // XMLNS
    // =========================
    it('should extract xmlns correctly', () => {
        const selected = `<local:MyView />`;
        const doc = `
            xmlns:local="clr-namespace:App.Views"
        `;
        const { extraXmlns, missingPrefixes } = (0, extractLogic_1.extractXmlns)(selected, doc);
        assert_1.default.ok(extraXmlns.includes('xmlns:local="clr-namespace:App.Views"'));
        assert_1.default.strictEqual(missingPrefixes.length, 0);
    });
    it('should detect missing xmlns', () => {
        const selected = `<vm:MyView />`;
        const doc = `
            xmlns:local="clr-namespace:App.Views"
        `;
        const { missingPrefixes } = (0, extractLogic_1.extractXmlns)(selected, doc);
        assert_1.default.deepStrictEqual(missingPrefixes, ['vm']);
    });
    it('should ignore x: prefix', () => {
        const selected = `<x:Type />`;
        const doc = `
            xmlns:x="http://schemas.microsoft.com/winfx/2009/xaml"
        `;
        const { extraXmlns, missingPrefixes } = (0, extractLogic_1.extractXmlns)(selected, doc);
        assert_1.default.strictEqual(extraXmlns.trim(), '');
        assert_1.default.strictEqual(missingPrefixes.length, 0);
    });
    // =========================
    // XAML GENERATION
    // =========================
    it('should generate valid XAML', () => {
        const result = (0, extractLogic_1.generateXaml)('App.Controls.MyControl', '<Label />', '\n             xmlns:local="test"');
        assert_1.default.ok(result.includes('<ContentView'));
        assert_1.default.ok(result.includes('x:Class="App.Controls.MyControl"'));
        assert_1.default.ok(result.includes('xmlns:local="test"'));
        assert_1.default.ok(result.includes('<Label />'));
    });
    // =========================
    // CODE BEHIND
    // =========================
    it('should generate code-behind with properties', () => {
        const props = (0, extractLogic_1.generateBindableProperties)([{ prop: 'Title', path: 'Title' }], 'MyControl');
        const result = (0, extractLogic_1.generateCodeBehind)('App.Controls', 'MyControl', props);
        assert_1.default.ok(result.includes('namespace App.Controls'));
        assert_1.default.ok(result.includes('partial class MyControl'));
        assert_1.default.ok(result.includes('InitializeComponent()'));
        assert_1.default.ok(result.includes('TitleProperty'));
    });
    // =========================
    // NAMESPACE PREFIX
    // =========================
    describe('Namespace Prefix Resolution', () => {
        it('should generate prefix from last namespace segment', () => {
            const { prefix } = (0, extractLogic_1.resolveNamespacePrefix)('Sample.Controls', '');
            assert_1.default.strictEqual(prefix, 'controls');
        });
        it('should reuse existing namespace prefix', () => {
            const extra = `xmlns:controls="clr-namespace:Sample.Controls"`;
            const result = (0, extractLogic_1.resolveNamespacePrefix)('Sample.Controls', extra);
            assert_1.default.strictEqual(result.prefix, 'controls');
            assert_1.default.strictEqual(result.xmlnsToAdd, '');
        });
        it('should increment prefix if already used', () => {
            const extra = `
            xmlns:controls="clr-namespace:Sample.Controls"
            xmlns:controls1="clr-namespace:Sample.Views.Controls"
        `;
            const result = (0, extractLogic_1.resolveNamespacePrefix)('Sample.Other.Controls', extra);
            assert_1.default.strictEqual(result.prefix, 'controls2');
        });
        it('should handle same suffix from different namespaces', () => {
            const extra = `
            xmlns:controls="clr-namespace:Sample.Controls"
        `;
            const result = (0, extractLogic_1.resolveNamespacePrefix)('Another.Controls', extra);
            assert_1.default.strictEqual(result.prefix, 'controls1');
        });
    });
    // =========================
    // XAML + DATATYPE
    // =========================
    describe('XAML with DataType', () => {
        it('should generate xaml with x:DataType', () => {
            const result = (0, extractLogic_1.generateXaml)('Sample.Controls.MyControl', '<Label />', '');
            assert_1.default.ok(result.includes('x:DataType="controls:MyControl"'));
            assert_1.default.ok(result.includes('xmlns:controls="clr-namespace:Sample.Controls"'));
        });
        it('should not duplicate xmlns for same namespace', () => {
            const extra = `
            xmlns:controls="clr-namespace:Sample.Controls"
        `;
            const result = (0, extractLogic_1.generateXaml)('Sample.Controls.MyControl', '<Label />', extra);
            const count = (result.match(/xmlns:controls/g) || []).length;
            assert_1.default.strictEqual(count, 1);
        });
    });
    // =========================
    // CONTROL USAGE (BINDINGS TRANSFER)
    // =========================
    describe('Control Usage Generation', () => {
        it('should generate control usage with bindings', () => {
            const usage = (0, extractLogic_1.generateControlUsage)('controls', 'MyControl', [
                { prop: 'Title', path: 'Title' },
                { prop: 'Description', path: 'Details.Description' }
            ]);
            assert_1.default.ok(usage.includes('<controls:MyControl'));
            assert_1.default.ok(usage.includes('Title="{Binding Title}"'));
            assert_1.default.ok(usage.includes('Description="{Binding Details.Description}"'));
        });
        it('should generate self-closing control when no bindings', () => {
            const usage = (0, extractLogic_1.generateControlUsage)('controls', 'MyControl', []);
            assert_1.default.strictEqual(usage.trim(), '<controls:MyControl />');
        });
    });
});
