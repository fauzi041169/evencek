import React from 'react';
import OwnerSection from './OwnerSection';
import ParticipationTypesSection from './ParticipationTypesSection';

export default function CorePreparationSection({ owners, participationTypes, activity }) {
    return (
        <div className="bg-white rounded-[2rem] shadow-xl shadow-gray-200/50 border border-gray-100 overflow-hidden mb-10 group">
            <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-gray-100">
                {/* Left Side: Owners */}
                <div className="flex flex-col h-full hover:bg-gray-50/30 transition-colors">
                    <OwnerSection owners={owners} activity={activity} isEmbedded={true} />
                </div>

                {/* Right Side: Participation Types */}
                <div className="flex flex-col h-full hover:bg-gray-50/30 transition-colors">
                    <ParticipationTypesSection participationTypes={participationTypes} activity={activity} isEmbedded={true} />
                </div>
            </div>
        </div>
    );
}
