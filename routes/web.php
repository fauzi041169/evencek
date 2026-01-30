<?php

use App\Http\Controllers\AboutController;
use App\Http\Controllers\ActivityBatchController;
use App\Http\Controllers\ActivityController;
use App\Http\Controllers\ActivityPreparationController;
use App\Http\Controllers\ActivitySpeakerController;
use App\Http\Controllers\AttendanceController;
use App\Http\Controllers\Auth\LoginController as AuthLoginController;
use App\Http\Controllers\CardSettingsController;
use App\Http\Controllers\CategoryController;
use App\Http\Controllers\CommentController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\EditableContentController;
use App\Http\Controllers\EventActivityController;
use App\Http\Controllers\GalleryController;
use App\Http\Controllers\HomeController;
use App\Http\Controllers\IdCardBackgroundController;
use App\Http\Controllers\MaintenanceController;
use App\Http\Controllers\SettingController;
use App\Http\Controllers\NewsController;
use App\Http\Controllers\PartnerController;
use App\Http\Controllers\PaymentController;
use App\Http\Controllers\PengurusController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\RegionController;
use App\Http\Controllers\SubscriptionController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\UserManagementController;
use App\Http\Controllers\Auth\RegisterController;
use App\Http\Controllers\Auth\EmailVerificationController;
use App\Http\Controllers\Auth\ForgotPasswordController;
use App\Http\Controllers\Auth\ResetPasswordController;
use App\Http\Controllers\ActivityEnrollmentController;
use App\Http\Controllers\ActivityParticipantGroupController;
use App\Http\Controllers\ActivityChatController;
use App\Http\Controllers\ApiMonitorController;
use App\Http\Controllers\ActivityScanController;
use App\Http\Controllers\CertificateSettingsController;
use App\Http\Controllers\MidtransPaymentController;
use App\Models\Activity;
use App\Http\Middleware\VerifyCsrfToken;
use Illuminate\Support\Facades\Route;

// ============================================================================
// API ROUTES
// ============================================================================

/*
|--------------------------------------------------------------------------
| Web Routes
|--------------------------------------------------------------------------
|
| Here is where you can register web routes for your application. These
| routes are loaded by the RouteServiceProvider and all of them will
| be assigned to the "web" middleware group. Make something great!
|
*/

// Public Routes
Route::get('/logout', [App\Http\Controllers\Auth\LoginController::class, 'logout'])->name('logout.get');
Route::post('/logout', [App\Http\Controllers\Auth\LoginController::class, 'logout'])->name('logout'); // Keep POST for standard compatibility
Route::get('/fix-storage-link', function () {
    try {
        Artisan::call('storage:link');
        return 'Storage link created successfully. <br>Output: ' . Artisan::output();
    } catch (\Exception $e) {
        return 'Error: ' . $e->getMessage();
    }
});
Route::get('/fix-session', function () {
    try {
        session()->flush();
        Auth::logout();
        return redirect('/')->with('success', 'Session cleared. Please login again.');
    } catch (\Exception $e) {
        return 'Error: ' . $e->getMessage();
    }
});
Route::get('/fix-logo', function () {
    try {
        \App\Models\Setting::set('app_logo', '/assets/images/logo.png');
        return 'Logo reset to default.';
    } catch (\Exception $e) {
        return 'Error: ' . $e->getMessage();
    }
});
Route::get('/', [HomeController::class, 'index'])->name('home');
// Fix for 404 on /login - redirect to home with login modal
Route::get('/login', function() {
    return redirect()->route('home', ['login' => 'true']);
});
Route::get('/about', [AboutController::class, 'index'])->name('about');

// Subscription Routes
Route::prefix('subscriptions')->name('subscriptions.')->controller(SubscriptionController::class)->group(function () {
    Route::get('/pricing', 'index')->name('pricing');
    Route::post('/subscribe', 'subscribe')->name('subscribe')->middleware('auth');
    
    // Payment callback (public)
    Route::post('/payment/notification', 'handleNotification')->name('payment.notification');
    
    // Payment process pages
    Route::get('/payment/finish', 'finish')->name('finish');
    Route::get('/payment/unfinish', 'unfinish')->name('unfinish');
    Route::get('/payment/error', [SubscriptionController::class, 'error'])->name('error');
    Route::get('/payment/{subscription}', 'showPayment')->name('payment.show');
    Route::post('/payment/{subscription}/retry', 'retryPayment')->name('payment.retry');
    
    // Protected routes
    Route::middleware('auth')->group(function () {
        Route::get('/my-subscription', 'mySubscription')->name('my');
        Route::get('/history', 'history')->name('history');
        Route::get('/invoices/{invoice}', 'downloadInvoice')->name('invoice');
        
        // Admin routes
        Route::get('/manage', 'manage')->name('manage')->middleware('role:admin,superadmin');
        Route::get('/subscriptions/manage-payments', 'managePaymentsAdmin')->name('subscriptions.payments.manage')->middleware('role:admin,superadmin');
        Route::post('/subscriptions/{subscription}/cancel', 'cancel')->name('cancel');
        Route::post('/subscriptions/{subscription}/renew', 'renew')->name('renew');
        // Admin/Superadmin: update status pembayaran langganan
        Route::post('/subscriptions/{subscription}/status', 'updatePaymentStatus')->name('payments.status')->middleware('role:admin,superadmin');
    });
});

// Editable Content API (public load, protected save)
Route::get('/editable-contents', [EditableContentController::class, 'index'])->name('editable-contents.index');
Route::post('/editable-contents', [EditableContentController::class, 'store'])
    ->name('editable-contents.store')
    ->middleware(['auth', 'throttle:30,1']);

// Authentication
Route::prefix('auth')->group(function () {
    Route::controller(AuthLoginController::class)->group(function () {
        Route::get('/login', 'index')->name('login');
        Route::post('/login', 'login')->name('login.submit')->middleware('throttle:5,1');
        Route::post('/logout', 'logout')->name('logout');
    });

    Route::name('auth.')->group(function () {
        Route::controller(RegisterController::class)->group(function () {
            Route::get('/register', 'showRegistrationForm')->name('register');
            Route::post('/register', 'store')->name('register.store')->middleware('throttle:5,1');
        });

        // Google OAuth
        Route::get('/google', [AuthLoginController::class, 'redirectToGoogle'])->name('google.login');
        Route::get('/google/callback', [AuthLoginController::class, 'handleGoogleCallback'])->name('google.callback');

        // Email Verification
        Route::get('/email/verify/{token}', [EmailVerificationController::class, 'verify'])->name('email.verify');
        Route::get('/email/verify-signed', [EmailVerificationController::class, 'verifySigned'])->name('email.verify.signed')->middleware('signed');
        Route::post('/email/resend', [EmailVerificationController::class, 'resend'])->name('email.resend')->middleware('throttle:5,1');
    });
});

// Password Reset
Route::prefix('password')->name('password.')->group(function () {
    Route::get('/forgot', [ForgotPasswordController::class, 'showLinkRequestForm'])->name('request');
    Route::post('/forgot', [ForgotPasswordController::class, 'sendResetLinkEmail'])->name('email')->middleware('throttle:5,1');
    Route::get('/reset/{token}', [ResetPasswordController::class, 'showResetForm'])->name('reset');
    Route::post('/reset', [ResetPasswordController::class, 'reset'])->name('update')->middleware('throttle:5,1');
});

// News Routes
Route::prefix('news')->name('news.')->group(function () {
    // Public routes
    Route::get('/', [NewsController::class, 'index'])->name('index');
    Route::get('/list', [NewsController::class, 'list'])->name('list');
    Route::get('/search', [NewsController::class, 'search'])->name('search');
    Route::get('/category/{category}', [NewsController::class, 'category'])->name('category');

    // Authenticated routes
    Route::middleware('auth')->group(function () {
        Route::get('/create', [NewsController::class, 'create'])->name('create');
        Route::post('/', [NewsController::class, 'store'])->name('store');
        Route::get('/{news}/edit', [NewsController::class, 'edit'])->name('edit');
        Route::put('/{news}', [NewsController::class, 'update'])->name('update');
        Route::delete('/{news}', [NewsController::class, 'destroy'])->name('destroy');
        Route::post('/upload-image', [NewsController::class, 'uploadImage'])->name('upload-image');
        Route::post('/{news:slug}/comments', [CommentController::class, 'storeForNews'])->name('comments.store')->middleware('throttle:10,1');
        // Instant rating for news
        Route::post('/{news:slug}/rate', [CommentController::class, 'rateNews'])->name('rate');
    });

    // Public show route using slug - must be last to avoid conflicts
    Route::get('/{news:slug}', [NewsController::class, 'show'])->name('show');
});

// Activity Speaker Photo (Public) - Safe method bypassing symlink
Route::get('/speakers/{speaker}/photo', [ActivitySpeakerController::class, 'getPhoto'])->name('activity.speakers.photo');

// Creator Page Settings
Route::post('/creator/{subdomain}/settings', [ActivityController::class, 'updatePageSettings'])->name('creator.page.settings');

// Payment Routes
Route::prefix('payments')->name('payments.')->middleware(['auth'])->controller(PaymentController::class)->group(function () {
    Route::get('/create/{activity}', 'create')->name('create');
    Route::get('/methods/{activity}', 'getPaymentMethodsJson')->name('methods');
    Route::post('/store/{activity}', 'store')->name('store');
    Route::get('/ledger', 'financialLedger')->name('ledger');
    Route::post('/channels/sync', 'syncChannels')->name('channels.sync'); // Added sync route
    
    // Rule Routes
    Route::post('/rules/vouchers', 'financialRulesCreateVoucher')->name('rules.vouchers.create');
    Route::post('/rules/auto-override', 'financialRulesSaveAutoOverride')->name('rules.auto-override.save');
    Route::delete('/rules/auto-override/{activity}', 'financialRulesDeleteAutoOverride')->name('rules.auto-override.delete');
    Route::post('/rules/subscription/visibility', 'setSubscriptionVisibility')->name('rules.subscription.visibility');

    // Bank Account Routes
    Route::post('/bank-account', 'saveBankAccount')->name('bank-account.save');
    Route::post('/bank-account/update', 'updateBankAccount')->name('bank-account.update');
    Route::post('/bank-account/delete', 'deleteBankAccount')->name('bank-account.delete');

    // Resource-like routes for payments (Edit/Destroy)
    Route::get('/{payment}/edit', 'edit')->name('edit');
    Route::put('/{payment}/verify', 'verify')->name('verify');
    Route::put('/{payment}', 'update')->name('update');
    Route::delete('/{payment}', 'destroy')->name('destroy');
});

// Activity Speaker CV (Public) - Safe method bypassing symlink
Route::get('/speakers/{speaker}/cv', [ActivitySpeakerController::class, 'getCv'])->name('activity.speakers.cv');
// Activity Material Serve (Public route with permission check in controller)
Route::get('/activity/{activityId}/materials/{materialId}/serve', [ActivityPreparationController::class, 'serveMaterial'])->name('activity.material.serve');

// Activity Routes (Public)
Route::prefix('activity')->name('activity.')->controller(ActivityController::class)->group(function () {
    Route::get('/', 'index')->name('index');
    // Specific routes must be defined before wildcard routes to avoid conflicts
    Route::get('/participants/search', 'searchParticipants')->name('participants.search');
    // Protected routes that need to be defined before wildcard
    Route::get('/list', [ActivityController::class, 'list'])->name('list')->middleware(['auth', 'role:creator,admin,superadmin']);
    Route::get('/search', [ActivityController::class, 'search'])->name('search')->middleware('auth');
    Route::get('/create', [ActivityController::class, 'create'])->name('create')->middleware('auth');
    Route::get('/manage', [ActivityController::class, 'manage'])->name('manage')->middleware('auth');
    // Wildcard routes must be last
    // IMPORTANT: Specific routes like 'detail' must be defined BEFORE the generic '{activity}' wildcard
    Route::match(['get', 'post'], '/{activity}/enroll', [ActivityEnrollmentController::class, 'enroll'])->name('enroll');
    Route::get('/{activity}/detail', 'detail')->name('detail');
    
    // Generic wildcard route - catches everything else, so it must be at the very bottom
    Route::get('/{activity}', 'show')->name('show');
});

// Activity comments (auth required)
Route::middleware('auth')->group(function () {
    Route::post('/activity/{activity}/comments', [CommentController::class, 'storeForActivity'])->name('activity.comments.store')->middleware('throttle:10,1');
    Route::post('/activity/{activity}/rate', [CommentController::class, 'rateActivity'])->name('activity.rate')->middleware('throttle:20,1');
});

// Partner Routes (Public)
Route::prefix('partners')->name('partners.')->controller(PartnerController::class)->group(function () {
    Route::get('/', 'index')->name('index');
});

// Region Routes
Route::prefix('region')->name('region.')->controller(RegionController::class)->group(function () {
    Route::get('/regencies/{province}', 'getRegencies')->name('regencies');
    Route::get('/districts/{regency}', 'getDistricts')->name('districts');
});

// Language Switch
Route::get('language/{locale}', function ($locale) {
    if (in_array($locale, ['en', 'id'])) {
        session()->put('locale', $locale);
    }

    return redirect()->back();
})->name('language.switch');

// Miscellaneous Public Routes
Route::get('/background-images', [IdCardBackgroundController::class, 'getBackgroundImages'])->name('background.images')->middleware('auth');

// Public certificate verification & view
Route::get('/activity/{id}/download-certificate', [ActivityController::class, 'downloadCertificate'])->name('activity.download-certificate');

Route::get('/activity/{id}/verify-certificate', [ActivityController::class, 'verifyCertificate'])->name('activity.verify-certificate');
Route::get('/c/{id}', [ActivityController::class, 'verifyCertificate'])->name('certificate.verify.short');

// ============================================================================
// PROTECTED ROUTES (AUTH REQUIRED)
// ============================================================================
Route::middleware(['auth', 'activity.logger'])->group(function () {

    Route::post('/activity/{activity}/toggle-price', [ActivityController::class, 'togglePriceVisibility'])->name('activity.toggle-price');
    Route::post('/activity/{activity}/toggle-section', [ActivityController::class, 'toggleSectionVisibility'])->name('activity.toggle-section');
    Route::post('/activity/{activity}/change-status', [ActivityController::class, 'changeStatus'])->name('activity.change-status');
    Route::post('/activity/{activity}/toggle-registration', [ActivityController::class, 'toggleRegistration'])->name('activity.toggle-registration');
    Route::post('/activity/{activity}/duplicate', [ActivityController::class, 'duplicate'])->name('activity.duplicate');

    // Event Activities (Voting, Quiz, Assignment)
    Route::prefix('activity/{activity}/activities')->name('activity.event-activities.')->controller(EventActivityController::class)->group(function () {
        Route::get('/', 'index')->name('index');
        Route::get('/create', 'create')->name('create');
        Route::post('/', 'store')->name('store');
        Route::get('/{eventActivity}/edit', 'edit')->name('edit');
        Route::put('/{eventActivity}', 'update')->name('update');
        Route::delete('/{eventActivity}', 'destroy')->name('destroy');
        Route::get('/{eventActivity}/results', 'results')->name('results');
        Route::get('/{eventActivity}', 'show')->name('show');
        Route::post('/{eventActivity}/participate', 'participate')->name('participate');
    });

    // Activity Batch Management
    Route::prefix('activity/{activity}/batches')->name('activity.batches.')->controller(ActivityBatchController::class)->group(function () {
        Route::get('/', 'index')->name('index');
        Route::post('/', 'store')->name('store');
        Route::put('/{batch}', 'update')->name('update');
        Route::delete('/{batch}', 'destroy')->name('destroy');
        Route::post('/{batch}/activate', 'activate')->name('activate');
    });

    // Activity Participant Group Management
    Route::prefix('activity/{activity}/participant-groups')->name('activity.participant-groups.')->controller(ActivityParticipantGroupController::class)->group(function () {
        Route::get('/', 'index')->name('index');
        Route::post('/', 'store')->name('store');
        Route::put('/{group}', 'update')->name('update');
        Route::delete('/{group}', 'destroy')->name('destroy');
        Route::post('/assign', 'assign')->name('assign');
    });

    // Activity Chat
    Route::prefix('activity/{activity}/chat')->name('activity.chat.')->controller(ActivityChatController::class)->group(function () {
        Route::get('/', 'index')->name('index');
        Route::get('/messages', 'getMessages')->name('messages');
        Route::post('/send', 'store')->name('send');
        Route::get('/conversations', 'getConversations')->name('conversations');
        Route::get('/unread-count', 'getUnreadCount')->name('unread-count');
    });

    // Activity Speaker Routes
    Route::prefix('activity/{activity}/speakers')->name('activity.speakers.')->controller(ActivitySpeakerController::class)->group(function () {
        Route::get('search', 'search')->name('search');
        Route::get('/', 'index')->name('index');
        Route::post('/', 'store')->name('store');
        Route::put('/{speaker}', 'update')->name('update');
        Route::delete('/{speaker}', 'destroy')->name('destroy');
        Route::post('/reorder', 'reorder')->name('reorder');
    });

    // Dashboard Routes
    Route::prefix('dashboard')->name('dashboard.')->controller(DashboardController::class)->group(function () {
        Route::get('/', 'index')->name('index');
        Route::get('/admin', 'admin')->name('admin')->middleware('admin');
        // Arahkan langsung ke dashboard user (statistik & kegiatan yang diikuti)
        Route::get('/user', 'userDashboard')->name('user');
        Route::post('/check-activity-enrollment', 'checkActivityEnrollment')->name('check-activity-enrollment');
        Route::get('/get-user-activities', 'getUserActivities')->name('get-user-activities');
    });

    // API Monitoring (Superadmin only)
    Route::get('/management/api', [ApiMonitorController::class, 'index'])
        ->name('api-monitor.index')
        ->middleware('role:superadmin');

    // Activity Preparation Routes
    Route::prefix('activity/{activityId}/preparation')->name('activity.preparation.')->middleware('auth')->controller(ActivityPreparationController::class)->group(function () {
        Route::get('/', 'index')->name('index');
        Route::get('/owners/search', 'searchUsers')->name('owners.search');
        Route::post('/owners', 'storeOwner')->name('store-owner');
        Route::delete('/owners/{userId}', 'destroyOwner')->name('destroy-owner');

        // Participation Types
        Route::post('/participation-types', [\App\Http\Controllers\ActivityParticipationTypeController::class, 'store'])->name('participation-types.store');
        Route::put('/participation-types/{typeId}', [\App\Http\Controllers\ActivityParticipationTypeController::class, 'update'])->name('participation-types.update');
        Route::delete('/participation-types/{typeId}', [\App\Http\Controllers\ActivityParticipationTypeController::class, 'destroy'])->name('participation-types.destroy');

        // Committee Types
        Route::post('/committee-types', [\App\Http\Controllers\ActivityCommitteeTypeController::class, 'store'])->name('committee-types.store');
        Route::put('/committee-types/{typeId}', [\App\Http\Controllers\ActivityCommitteeTypeController::class, 'update'])->name('committee-types.update');
        Route::delete('/committee-types/{typeId}', [\App\Http\Controllers\ActivityCommitteeTypeController::class, 'destroy'])->name('committee-types.destroy');

        Route::post('/participants/import', 'importParticipants')->name('import-participants');
        Route::post('/participants/check', 'checkParticipants')->name('check-participants');
        Route::get('/participants/get-import-template', 'getImportTemplate')->name('get-import-template');
        Route::get('/participants/import', 'importParticipantsGet')->name('import-participants.get');
        Route::get('/participants/template', 'downloadParticipantsTemplate')->name('download-participants-template');
        Route::get('/participants/import-result-excel', 'downloadImportResultExcel')->name('download-import-result-excel');
        Route::post('/participants/{userId}/status', 'updateParticipantStatus')->name('update-participant-status');
        Route::delete('/participants/{userId}', 'destroyParticipantUser')->name('destroy-participant-user');
        Route::post('/divisions', 'storeDivision')->name('store-division');
        Route::put('/divisions/{divisionId}', 'updateDivision')->name('update-division');
        Route::delete('/divisions/{divisionId}', 'destroyDivision')->name('destroy-division');
        Route::get('/divisions/{divisionId}/requirements', 'showRequirements')->name('requirements');
        Route::post('/divisions/{divisionId}/requirements', 'storeRequirement')->name('store-requirement');
        Route::put('/divisions/{divisionId}/requirements/{requirementId}', 'updateRequirement')->name('update-requirement');
        Route::delete('/divisions/{divisionId}/requirements/{requirementId}', 'destroyRequirement')->name('destroy-requirement');
        Route::get('/committee', 'showCommittee')->name('committee');
        Route::post('/committee', 'storeCommittee')->name('store-committee');
        Route::put('/committee/{committeeId}', 'updateCommittee')->name('update-committee');
        Route::delete('/committee/{committeeId}', 'destroyCommittee')->name('destroy-committee');
        Route::post('/rundowns', 'storeRundown')->name('store-rundown');
        Route::put('/rundowns/{rundownId}', 'updateRundown')->name('update-rundown');
        Route::delete('/rundowns/{rundownId}', 'destroyRundown')->name('destroy-rundown');
        Route::post('/rundowns/import', 'importRundowns')->name('import-rundowns');
        Route::get('/rundowns/template', 'downloadRundownTemplate')->name('download-rundown-template');
        Route::post('/materials', 'storeMaterial')->name('store-material');
        Route::get('/materials/{materialId}/download', 'downloadMaterial')->name('download-material');
        Route::get('/materials/{materialId}/view', 'viewMaterial')->name('view-material');
        Route::get('/materials/{materialId}/serve', 'serveMaterial')->name('serve-material');
        Route::delete('/materials/{materialId}', 'destroyMaterial')->name('destroy-material');
    });

    // Activity Participants Routes
    Route::prefix('activity/{activityId}/participants')->name('activity.participants.')->middleware('auth')->controller(ActivityPreparationController::class)->group(function () {
        Route::get('/', 'participants')->name('index');
        Route::post('/change-role-bulk', 'changeRoleBulk')->name('change-role-bulk');
        Route::get('/get-all-ids', 'getAllParticipantIds')->name('get-all-ids');
        Route::post('/rooms', 'storeRoom')->name('rooms.store');
        Route::put('/rooms/{roomId}', 'updateRoom')->name('rooms.update');
        Route::delete('/rooms/batch', 'destroyRoomsBatch')->name('rooms.destroy-batch');
        Route::delete('/rooms/destroy-all', 'destroyAllRooms')->name('rooms.destroy-all');
        Route::post('/rooms/batch/activate', 'activateRoomsBatch')->name('rooms.activate-batch');
        Route::post('/rooms/batch/deactivate', 'deactivateRoomsBatch')->name('rooms.deactivate-batch');
        Route::delete('/rooms/{roomId}', 'destroyRoom')->name('rooms.destroy');
        Route::post('/assign-room', 'assignRoom')->name('assign-room');
        Route::post('/rooms/import', 'importRooms')->name('rooms.import');
        Route::post('/rooms/{roomId}/toggle', 'toggleRoomStatus')->name('rooms.toggle');
        Route::get('/rooms/template', 'downloadRoomsTemplate')->name('rooms.template');
        Route::post('/verify-email/{userId}', 'verifyEmail')->name('verify-email');
        Route::post('/verify-email-bulk', 'verifyEmailBulk')->name('verify-email-bulk');
        Route::post('/toggle-status/{userId}', 'toggleParticipantStatus')->name('toggle-status');
        Route::post('/save-column-settings', 'saveColumnSettings')->name('save-column-settings');
        Route::post('/fill-gender', 'fillGender')->name('fill-gender');
    });

    // Activity Management Routes
    Route::prefix('activity')->name('activity.')->controller(ActivityController::class)->middleware(['track.activity.access'])->group(function () {
        // Note: /list, /search, /create, /manage are defined in public routes above to avoid wildcard conflicts
        Route::post('/', 'store')->name('store');
        Route::get('/{activity}/dashboard', 'dashboard')->name('dashboard');
        Route::get('/{activity}/stats/region', 'getRegionStats')->name('stats.region');
        Route::get('/{activity}/edit', 'edit')->name('edit');
        Route::put('/{activity}', 'update')->name('update');
        Route::delete('/{activity}', 'destroy')->name('destroy');
        Route::post('/{activity}/change-status', 'changeStatus')->name('change-status');
        Route::post('/{id}/toggle-hero-pin', 'toggleHeroPin')->name('toggleHeroPin');
        Route::get('/{id}/export/{format}', 'export')->name('export');
        // React pages for printing
        Route::get('/{id}/custom-certificate', 'designCertificate')->name('custom-certificate')->middleware('auth');
        Route::get('/{id}/certificates', 'showCertificates')->name('certificates')->middleware('auth');
        Route::get('/{id}/idcards', 'showIdCards')->name('idcards')->middleware('auth');
        Route::get('/{id}/idcards/design', 'designIdCard')->name('idcards.design')->middleware('auth');
        
        // Print HTML endpoints
        Route::get('/{id}/print-cards-html/{type?}', 'printCardsHtml')->name('activity.print-cards-html')->middleware('auth');
        Route::get('/{id}/print-certificates-html', 'printCertificatesHtml')->name('print-certificates-html');
        
        // Legacy print endpoints
        Route::get('/{id}/print-cards', 'printCardsHtml')->name('print-cards')->middleware('auth');
        Route::get('/{id}/print-certificates', 'printCertificatesHtml')->name('print-certificates')->middleware('role:admin,creator,superadmin,user');
        Route::get('/{activity}/remove-participants', function (Activity $activity) {
            return redirect()->back()->with('error', 'Permintaan ini memerlukan metode POST. Silakan gunakan formulir untuk menghapus peserta.');
        })->middleware('auth');
        Route::post('/{activity}/remove-participants', 'removeParticipants')->name('removeParticipants')->middleware('auth');
        Route::put('/{id}/content', 'updateContent')->name('content.update');
        Route::post('/gallery/{id}/update-caption', 'updateGalleryCaption')->name('gallery.update-caption');
        Route::post('/{id}/toggle-price', 'togglePrice')->name('togglePrice');
        Route::post('/{id}/toggle-registration', 'toggleRegistration')->name('toggleRegistration');
        Route::post('/{id}/toggle-gallery', 'toggleGallery')->name('toggleGallery');
        Route::post('/{id}/toggle-comments', 'toggleComments')->name('toggleComments');
        // Dipindahkan ke route publik (di luar grup auth)
        Route::post('/ajax-participants', 'ajaxParticipants')->name('ajax-participants');
        Route::post('/{id}/toggle-card-visibility', 'toggleCardButtonsVisibility')->name('toggleCardVisibility')->middleware('role:superadmin');
        Route::post('/{id}/toggle-download-card-visibility', 'toggleDownloadCardVisibility')->name('toggleDownloadCardVisibility')->middleware('auth');
        Route::post('/{id}/toggle-card-id-visibility', 'toggleCardIdVisibility')->name('toggleCardIdVisibility')->middleware('auth');
        Route::post('/{id}/toggle-rundown-visibility', 'toggleRundownVisibility')->name('toggleRundownVisibility')->middleware('auth');
        Route::post('/{id}/toggle-materials-visibility', 'toggleMaterialsVisibility')->name('toggleMaterialsVisibility')->middleware('auth');
        Route::post('/{id}/toggle-participants-visibility', 'toggleParticipantsVisibility')->name('toggleParticipantsVisibility')->middleware('auth');
        Route::post('/{id}/toggle-rooms-visibility', 'toggleRoomsVisibility')->name('toggleRoomsVisibility')->middleware('auth');
        Route::post('/{id}/toggle-groups-visibility', 'toggleGroupsVisibility')->name('toggleGroupsVisibility')->middleware('auth');
        Route::post('/{id}/toggle-description-visibility', 'toggleDescriptionVisibility')->name('toggleDescriptionVisibility')->middleware('auth');
        Route::post('/{id}/toggle-detail-gallery', 'toggleDetailGallery')->name('toggleDetailGallery')->middleware('auth');
        Route::post('/{id}/toggle-detail-comments', 'toggleDetailComments')->name('toggleDetailComments')->middleware('auth');
        Route::post('/{id}/toggle-detail-participants', 'toggleDetailParticipants')->name('toggleDetailParticipants')->middleware('auth');
        Route::post('/{id}/toggle-detail-description', 'toggleDetailDescription')->name('toggleDetailDescription')->middleware('auth');
        Route::post('/{id}/toggle-detail-rundown', 'toggleDetailRundown')->name('toggleDetailRundown')->middleware('auth');
        Route::post('/{id}/toggle-detail-materials', 'toggleDetailMaterials')->name('toggleDetailMaterials')->middleware('auth');
        Route::post('/{id}/toggle-detail-speakers', 'toggleDetailSpeakers')->name('toggleDetailSpeakers')->middleware('auth');
        Route::post('/{id}/toggle-speakers-visibility', 'toggleSpeakersVisibility')->name('toggleSpeakersVisibility')->middleware('auth');
        Route::post('/description-image-upload', 'uploadDescriptionImage')->name('image.upload');
    });

    // Partner Management Routes
    Route::prefix('partners')->name('partners.')->controller(PartnerController::class)->group(function () {
        Route::get('/list', 'list')->name('list');
        Route::get('/create', 'create')->name('create');
        Route::post('/', 'store')->name('store');
        Route::get('/{partner}/edit', 'edit')->name('edit');
        Route::put('/{partner}', 'update')->name('update');
        Route::delete('/{partner}', 'destroy')->name('destroy');
    });

    Route::resource('users', UserController::class)->middleware(['auth', 'role:admin,superadmin']);
    Route::post('/users/export', [UserController::class, 'export'])->name('users.export')->middleware(['auth', 'role:admin,superadmin']);

    // User Management Routes (Admin and Superadmin only)
    Route::prefix('user-management')->name('user-management.')->middleware('role:admin,superadmin')->controller(UserManagementController::class)->group(function () {
        Route::get('/', 'index')->name('index');
        Route::post('/', 'store')->name('store');
        Route::get('/search', 'searchUsers')->name('search');
        Route::get('/template', 'downloadTemplate')->name('download-template');
        Route::post('/import', 'import')->name('import');
        Route::put('/{user}/role', 'updateRole')->name('update-role');
        Route::put('/{user}/subscription', 'updateSubscription')->name('update-subscription');
        Route::post('/{user}/reset-password', 'resetPassword')->name('reset-password');
        Route::delete('/{user}', 'destroy')->name('destroy');
        Route::get('/{user}', 'show')->name('show');
    });

    // User Profile Routes
    Route::prefix('profile')->name('profile.')->controller(ProfileController::class)->group(function () {
        Route::get('/', 'index')->name('index');
        Route::match(['put', 'post'], '/update', 'update')->name('update');
        Route::put('/password/update', 'updatePassword')->name('update-password');
        Route::post('/upgrade-to-creator', 'upgradeToCreator')->name('upgrade-to-creator');
        Route::post('/subdomain', 'updateSubdomain')->name('update-subdomain');
        Route::post('/photo', 'updatePhoto')->name('photo.update');
        // AJAX routes for region data
        Route::prefix('ajax')->name('ajax.')->group(function () {
            Route::get('provinces', 'getProvinces')->name('provinces');
            Route::get('regencies/{province}', 'getRegencies')->name('regencies');
            Route::get('districts/{regency}', 'getDistricts')->name('districts');
        });

        Route::get('/{user}', 'show')->name('show');
        Route::get('/{user}/edit', 'edit')->name('edit');
        Route::match(['put', 'post'], '/{id}', 'update')->name('update-user');
    });

    // Category Routes
    Route::prefix('kategori')->name('kategori.')->controller(CategoryController::class)->group(function () {
        Route::get('/', 'index')->name('index');
        Route::post('/store', 'store')->name('store');
        Route::put('/{category}', 'update')->name('update');
        Route::delete('/{category}', 'destroy')->name('destroy');
    });
    // Attendance Routes (auth required)
    Route::prefix('attendance')->name('attendance.')->middleware('auth')->controller(AttendanceController::class)->group(function () {
        Route::post('/scan/store', 'storeScan')->name('scan.store');
        Route::post('/store-attendance', 'storeAttendance')->name('store.attendance');
        Route::post('/check-user', 'checkUser')->name('check.user');
        Route::post('/check-status', 'checkAttendanceStatus')->name('check.status');
        Route::get('/management/{activity?}', 'index')->name('management');
        Route::get('/{activity}/create', 'create')->name('create');
        Route::get('/download', 'download')->name('download');
        Route::post('/{activity}/store', 'store')->name('store');
        Route::post('/{attendance}/toggle-visibility', 'toggleVisibility')->name('toggle.visibility');
        Route::get('/{activity}/{attendance}/edit', 'edit')->name('edit');
        Route::put('/{activity}/{attendance}', 'update')->name('update');
        Route::get('/{activity}/{attendance}/scan', 'scan')->name('scan');
        Route::get('/results/{attendance}', 'showResults')->name('results');
        Route::delete('/{attendance}', 'destroy')->name('destroy');
        Route::get('/check-attendance', 'checkAttendance')->name('check.attendance');
        Route::get('/check-new/{activity_id}/{attendance_id}', 'checkNewData')->name('check-new');
        Route::post('/toggle', 'toggleAttendance')->name('toggle');
        Route::post('/toggle-mandiri', 'toggleMandiri')->name('toggle.mandiri');
        Route::post('/mark-all-present', 'markAllPresent')->name('mark.all.present');
        Route::post('/mandiri', 'doMandiriAttendance')->name('mandiri');
        Route::post('/record-status', 'recordStatus')->name('record.status');
        Route::get('/last-record', 'lastRecord')->name('last.record');
        Route::post('/process-scan', 'processQRScan')->name('process.scan');
        // Scan page backgrounds management
        Route::post('/scan-backgrounds/upload', 'uploadScanBackground')->name('scan.backgrounds.upload');
        Route::post('/scan-backgrounds/delete', 'deleteScanBackground')->name('scan.backgrounds.delete');
        });

    Route::prefix('attendance')
        ->name('attendance.')
        ->middleware('auth')
        ->controller(ActivityScanController::class)
        ->group(function () {
            Route::post('/scan/activity-store', 'store')->name('scan.activity.store');
        });



    // Certificate Settings Routes (mirip CardSettingsController)
    Route::prefix('certificate-settings')->name('certificate-settings.')->controller(\App\Http\Controllers\CertificateSettingsController::class)->group(function () {
        Route::post('/save', 'update')->name('save');
        Route::post('/background/upload', 'uploadBackground')->name('background.upload');
        Route::post('/background/delete', 'deleteBackground')->name('background.delete');
        Route::get('/background/list/{activity}', 'getBackgroundImages')->name('background.list');
    });

    // Pengurus Routes
    Route::prefix('pengurus')->name('pengurus.')->controller(PengurusController::class)->group(function () {
        Route::get('/', 'index')->name('index');
        Route::get('/create', 'create')->name('create');
        Route::post('/store', 'store')->name('store');
        Route::get('/edit/{pengurus}', 'edit')->name('edit');
        Route::put('/update/{pengurus}', 'update')->name('update');
        Route::delete('/{pengurus}', 'destroy')->name('destroy');
    });

    // Payment Routes
    Route::prefix('payments')->name('payments.')->controller(PaymentController::class)->group(function () {
        Route::get('/channels', 'channels')->name('channels')->middleware('role:admin,superadmin');
        Route::post('/channels/{channel}/toggle', 'toggleChannel')->name('channels.toggle')->middleware('role:admin,superadmin');
        Route::post('/channels/{channel}/update', 'updateChannel')->name('channels.update')->middleware('role:admin,superadmin');
        Route::get('/manage', 'manage')->name('manage')->middleware('auth');
        Route::get('/', 'index')->name('index');
        Route::get('/lookup', 'lookupByActivityUser')->name('lookup');
        Route::get('/activities/{activity}/create', 'create')->name('activity.create');
        Route::post('/activities/{activity}', 'store')->name('activity.store');
        // Financial Ledger (Neraca Keuangan) — place BEFORE catch-all '/{payment}'
        Route::get('/rules', 'financialRules')->name('rules')->middleware('role:admin,superadmin');
        Route::post('/rules', 'financialRulesSave')->name('rules.store')->middleware('role:admin,superadmin');
        Route::post('/rules/subscription-prices', 'financialRulesSaveSubscriptionPrices')->name('rules.subscription.save')->middleware('role:admin,superadmin');
        Route::post('/rules/plan-facilities', 'financialRulesSavePlanFacilities')->name('rules.plan-facilities.save')->middleware('role:admin,superadmin');
        Route::get('/{payment}', 'show')->name('show');
        Route::post('/{payment}/update-proof', 'updateProof')->name('update-proof');
        Route::put('/{payment}/verify', 'verify')->name('verify'); // Permission check dilakukan di controller
        Route::post('/withdraw/request', 'withdrawRequest')->name('withdraw.request')->middleware('role:admin,superadmin,creator');
        Route::get('/withdraw/history', 'withdrawHistory')->name('admin.withdraw.history')->middleware('role:admin,superadmin,creator');
        Route::get('/withdraw/{withdrawal}', 'withdrawShow')->name('withdraw.show')->middleware('role:admin,superadmin,creator');
        Route::post('/withdraw/{withdrawal}/pay', 'withdrawMarkPaid')->name('withdraw.pay')->middleware('role:admin,superadmin');
    });

    // Midtrans Payment Routes
    // Webhook dari Midtrans tidak membawa CSRF token, jadi kecualikan middleware CSRF
    Route::post('/midtrans/notification', [\App\Http\Controllers\MidtransPaymentController::class, 'handleNotification'])
        ->name('midtrans.notification')
        ->withoutMiddleware([\App\Http\Middleware\VerifyCsrfToken::class, 'auth', 'activity.logger']);

    Route::prefix('midtrans')->name('midtrans.')->middleware(['auth', 'activity.logger'])->controller(\App\Http\Controllers\MidtransPaymentController::class)->group(function () {
        Route::get('/payment/finish', 'finish')->name('payment.finish');
        Route::get('/payment/unfinish', 'unfinish')->name('payment.unfinish');
        Route::get('/payment/error', 'paymentError')->name('payment.error');
        Route::post('/payment/update-token', 'updateSnapToken')->name('payment.update-token');
        Route::get('/payment/{activity}', 'create')->name('payment.create');
        Route::get('/check-status', 'checkStatusApi')->name('payment.check-status')->middleware('throttle:10,1');
    });

    // Gallery Routes
    Route::prefix('gallery')->name('gallery.')->group(function () {
        Route::post('activity/{activity}', [GalleryController::class, 'store'])->name('store');
        Route::delete('activity/{activity}/{gallery}', [GalleryController::class, 'destroy'])->name('destroy');
    });

    // Settings Routes
    Route::post('/card-settings/save', [CardSettingsController::class, 'update'])->name('card-settings.save.legacy');
    Route::post('/card-settings/upload-background', [IdCardBackgroundController::class, 'upload'])->name('card-settings.upload-background.legacy');
    Route::prefix('settings')->name('settings.')->group(function () {
        Route::get('/', [SettingController::class, 'index'])->name('index');
        Route::post('/', [SettingController::class, 'update'])->name('update');
        Route::post('/card-settings/save', [CardSettingsController::class, 'update'])->name('card-settings.save');
    });

    // App Download Route
    Route::get('/download-apk', [SettingController::class, 'downloadApk'])->name('app.download-apk');


    // ID Card Background Upload
    Route::post('/idcard-background/upload', [IdCardBackgroundController::class, 'upload'])
        ->middleware(['auth', 'throttle:30,1'])
        ->name('idcard-background.upload');
    Route::post('/idcard-background/delete', [IdCardBackgroundController::class, 'delete'])
        ->middleware(['auth', 'throttle:30,1'])
        ->name('idcard-background.delete');
    Route::get('/idcard-background/list/{activity}', [IdCardBackgroundController::class, 'getBackgroundImages'])
        ->middleware(['auth', 'throttle:60,1'])
        ->name('idcard-background.list');

    // Maintenance Mode Routes
    Route::prefix('maintenance')->name('maintenance.')->controller(MaintenanceController::class)->group(function () {
        Route::get('/', 'index')->name('index')->middleware('role:superadmin');
        Route::post('/update', 'update')->name('update')->middleware('role:superadmin');
        Route::post('/update-app', 'updateApp')->name('update-app')->middleware('role:superadmin');
        Route::post('/enable', 'enable')->name('enable')->middleware('role:superadmin');
        Route::post('/disable', 'disable')->name('disable')->middleware('role:superadmin');
        Route::post('/toggle-apk', 'toggleApkVisibility')->name('toggle-apk')->middleware('role:superadmin');
        Route::post('/upload-apk', 'uploadApk')->name('upload-apk')->middleware('role:superadmin');
        Route::post('/delete-apk', 'deleteApk')->name('delete-apk')->middleware('role:superadmin');
        
        // Logs
        Route::get('/logs', 'logs')->name('logs')->middleware('role:superadmin');
        Route::post('/logs/clear', 'clearLogs')->name('logs.clear')->middleware('role:superadmin');
        Route::get('/logs/download', 'logsDownload')->name('logs.download')->middleware('role:superadmin');
        
        // NPM Build
        Route::post('/npm-run-build', 'npmRunBuild')->name('npm-run-build')->middleware('role:superadmin');

        // Artisan Commands
        Route::prefix('artisan')->name('artisan.')->group(function () {
            Route::post('/migrate', 'artisanMigrate')->name('migrate')->middleware('role:superadmin');
            Route::post('/seed', 'artisanSeed')->name('seed')->middleware('role:superadmin');
            Route::post('/optimize-clear', 'artisanOptimizeClear')->name('optimize-clear')->middleware('role:superadmin');
            Route::post('/cache-clear', 'artisanCacheClear')->name('cache-clear')->middleware('role:superadmin');
            Route::post('/config-clear', 'artisanConfigClear')->name('config-clear')->middleware('role:superadmin');
            Route::post('/route-clear', 'artisanRouteClear')->name('route-clear')->middleware('role:superadmin');
            Route::post('/view-clear', 'artisanViewClear')->name('view-clear')->middleware('role:superadmin');
            Route::post('/config-cache', 'artisanConfigCache')->name('config-cache')->middleware('role:superadmin');
            Route::post('/route-cache', 'artisanRouteCache')->name('route-cache')->middleware('role:superadmin');
            Route::post('/storage-link', 'artisanStorageLink')->name('storage-link')->middleware('role:superadmin');
            Route::post('/clear-all', 'artisanClearAll')->name('clear-all')->middleware('role:superadmin');
        });
        Route::post('/cleanup-storage', 'cleanupStorage')->name('cleanup-storage')->middleware('role:superadmin');
        Route::post('/cleanup-clockwork', 'cleanupClockwork')->name('cleanup-clockwork')->middleware('role:superadmin');
    });
});
