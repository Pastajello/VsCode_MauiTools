"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const assert_1 = __importDefault(require("assert"));
const extractToControl_1 = require("../src/commands/extractToControl");
describe('XAML Extract Tests', () => {
    // =========================
    // BINDINGS
    // =========================
    it('should extract simple bindings', () => {
        const input = `
            <Label Text="{Binding Title}" />
            <Label Text="{Binding Details.Description}" />
        `;
        const result = (0, extractToControl_1.extractBindings)(input);
        assert_1.default.deepStrictEqual(result, ['Title', 'Details']);
    });
    it('should ignore duplicates', () => {
        const input = `
            <Label Text="{Binding Title}" />
            <Label Text="{Binding Title}" />
        `;
        const result = (0, extractToControl_1.extractBindings)(input);
        assert_1.default.deepStrictEqual(result, ['Title']);
    });
    // =========================
    // BINDABLE PROPS
    // =========================
    it('should generate bindable properties', () => {
        const result = (0, extractToControl_1.generateBindableProperties)(['Title'], 'MyControl');
        assert_1.default.ok(result.includes('TitleProperty'));
        assert_1.default.ok(result.includes('typeof(object)'));
        assert_1.default.ok(result.includes('public object Title'));
    });
    // =========================
    // XMLNS
    // =========================
    it('should extract xmlns correctly', () => {
        const selected = `<local:MyView />`;
        const doc = `
            xmlns:local="clr-namespace:App.Views"
        `;
        const { extraXmlns, missingPrefixes } = (0, extractToControl_1.extractXmlns)(selected, doc);
        assert_1.default.ok(extraXmlns.includes('xmlns:local'));
        assert_1.default.strictEqual(missingPrefixes.length, 0);
    });
    it('should detect missing xmlns', () => {
        const selected = `<vm:MyView />`;
        const doc = `
            xmlns:local="clr-namespace:App.Views"
        `;
        const { missingPrefixes } = (0, extractToControl_1.extractXmlns)(selected, doc);
        assert_1.default.deepStrictEqual(missingPrefixes, ['vm']);
    });
    // =========================
    // XAML
    // =========================
    it('should generate valid XAML', () => {
        const result = (0, extractToControl_1.generateXaml)('App.Controls.MyControl', '<Label />', '\n xmlns:local="test"');
        assert_1.default.ok(result.includes('ContentView'));
        assert_1.default.ok(result.includes('x:Class="App.Controls.MyControl"'));
        assert_1.default.ok(result.includes('xmlns:local'));
    });
});
