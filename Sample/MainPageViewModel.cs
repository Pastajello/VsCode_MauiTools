using System.Collections.ObjectModel;

namespace Sample;

public class MainViewModel
{
    public ItemModel User { get; set; } = new();

    public ObservableCollection<ItemModel> Items { get; set; } = new();

    public Command SubmitCommand { get; set; }

    public MainViewModel()
    {
        SubmitCommand = new Command(() => { });

        Items.Add(new ItemModel
        {
            Title = "Item 1",
            Details = new ItemDetails
            {
                Description = "First item description"
            }
        });

        Items.Add(new ItemModel
        {
            Title = "Item 2",
            Details = new ItemDetails
            {
                Description = "Second item description"
            }
        });
    }
}