use Spatie\Permission\Models\Role;

public function run()
{
    $admin = Role::create(['name' => 'admin']);
    $admin->givePermissionTo([
        'view-pengurus',
        'create-pengurus',
        'edit-pengurus',
        'delete-pengurus'
    ]);
} 