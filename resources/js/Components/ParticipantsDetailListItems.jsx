import React from 'react';

const STATUS_ACTIVE = 1;
const STATUS_VERIFICATION = 0;
const STATUS_REJECTED = 2;

export default function ParticipantsDetailListItems({ 
    participants = [], 
    activity = null,
    disableClick = false,
    showRoomColumns = true,
    showGroupColumns = false,
    roomMap = {},
    groupMap = {},
    batches = {},
    onParticipantClick = null
}) {
    const defaultPhoto = '/assets/images/profilefoto/default-profile.png';
    
    const getStatusInfo = (pivotStatus, isFreeActivity) => {
        let status = pivotStatus;
        
        // For free activities, treat verification status as active
        if (isFreeActivity && status === STATUS_VERIFICATION) {
            status = STATUS_ACTIVE;
        }

        switch (status) {
            case STATUS_ACTIVE:
                return { text: 'Aktif', class: 'bg-green-100 text-green-800 border-green-200' };
            case STATUS_VERIFICATION:
                return { text: 'Menunggu Verifikasi', class: 'bg-yellow-100 text-yellow-800 border-yellow-200' };
            case STATUS_REJECTED:
                return { text: 'Ditolak', class: 'bg-red-100 text-red-800 border-red-200' };
            default:
                return { text: 'Menunggu Pembayaran', class: 'bg-sky-100 text-sky-800 border-sky-200' };
        }
    };

    const getRoomInfo = (userId) => {
        const info = roomMap[userId];
        if (!info || typeof info !== 'object') return { roomInfo: null, roomNotes: null };

        const hotel = (info.hotel_name || '').trim();
        const room = (info.room_number || '').trim();
        const notes = (info.notes || '').trim();
        const roomLower = room.toLowerCase();
        const isSpecial = ['belum dapat kamar', 'tidak dapat kamar'].includes(roomLower);

        let roomInfo = null;
        if (hotel || room) {
            if (room) {
                const roomLabel = isSpecial ? room : `Kamar ${room}`;
                roomInfo = isSpecial ? roomLabel : `${hotel ? hotel + ' - ' : ''}${roomLabel}`.trim();
            } else {
                roomInfo = hotel;
            }
        }

        return { roomInfo, roomNotes: notes || null };
    };

    const handleClick = (user) => {
        if (!disableClick && onParticipantClick) {
            onParticipantClick(user, activity?.id);
        }
    };

    if (!participants || participants.length === 0) {
        return (
            <li className="text-gray-500 p-4 text-center">Belum ada peserta.</li>
        );
    }

    const isFreeActivity = activity && parseInt(activity.price || 0) === 0;
    const hasBatches = batches && Object.keys(batches).length > 1;

    return (
        <>
            {participants.map((user) => {
                const fotoUrl = user.profile?.foto_url || defaultPhoto;
                const pivotStatus = parseInt(user.pivot?.status ?? -1);
                const statusInfo = getStatusInfo(pivotStatus, isFreeActivity);
                const provinceName = user.profile?.province?.name || '-';
                const regencyName = user.profile?.regency?.name || '-';
                const { roomInfo, roomNotes } = getRoomInfo(user.id);
                
                // Batch name
                let batchName = null;
                if (hasBatches && user.pivot?.activity_batch_id && batches[user.pivot.activity_batch_id] && activity?.activity_type === 'batch') {
                    batchName = batches[user.pivot.activity_batch_id].name;
                }

                // Group name
                const groupName = groupMap[user.id] || null;

                return (
                    <li 
                        key={user.id}
                        className={`flex items-center justify-between p-3 rounded-xl border border-gray-200 w-full gap-3 bg-white ${
                            !disableClick ? 'cursor-pointer hover:bg-gray-50 transition-colors' : ''
                        }`}
                        onClick={() => handleClick(user)}
                        data-user-id={user.id}
                        data-activity-id={activity?.id || ''}
                    >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                            <img 
                                src={fotoUrl} 
                                className="flex-shrink-0 rounded-full w-9 h-9 object-cover" 
                                alt={`Foto profil ${user.name}`}
                                onError={(e) => { e.target.src = defaultPhoto; }}
                            />
                            <div className="min-w-0">
                                <div className="text-gray-900 font-semibold whitespace-normal break-words sm:truncate">
                                    {user.name}
                                </div>
                                <div className="text-xs text-gray-600 truncate">
                                    {batchName && (
                                        <>
                                            <span className="text-indigo-600 font-medium">{batchName}</span>
                                            {' - '}
                                        </>
                                    )}
                                    {showGroupColumns && groupName && (
                                        <>
                                            <span className="text-purple-600 font-medium">{groupName}</span>
                                            {' - '}
                                        </>
                                    )}
                                    {user.profile?.instansi && (
                                        <>
                                            {user.profile.instansi}
                                            {' - '}
                                        </>
                                    )}
                                    {provinceName} - {regencyName}
                                </div>
                                {showRoomColumns && roomInfo && (
                                    <div className="text-xs text-gray-500 mt-0.5">
                                        <i className="fas fa-bed mr-1"></i>
                                        {roomInfo}
                                        {roomNotes && (
                                            <span className="ml-2 text-gray-400">({roomNotes})</span>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="flex items-center ml-3 shrink-0 gap-2">
                            <span className={`px-2 py-1 text-xs font-medium rounded-full border ${statusInfo.class}`}>
                                {statusInfo.text}
                            </span>
                        </div>
                    </li>
                );
            })}
        </>
    );
}
