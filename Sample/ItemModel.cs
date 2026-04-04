namespace Sample;

public class ItemModel
{
    public string Title { get; set; } = string.Empty;

    public ItemDetails Details { get; set; } = new();
}