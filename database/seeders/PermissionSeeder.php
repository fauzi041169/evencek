use Spatie\Permission\Models\Permission;

public function run()
{
    Permission::create(['name' => 'view-pengurus']);
    Permission::create(['name' => 'create-pengurus']);
    Permission::create(['name' => 'edit-pengurus']);
    Permission::create(['name' => 'delete-pengurus']);
} 