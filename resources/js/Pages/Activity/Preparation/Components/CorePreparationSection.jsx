import React from 'react';
import OwnerSection from './OwnerSection';
import ParticipationTypesSection from './ParticipationTypesSection';
import CommitteeTypesSection from './CommitteeTypesSection';

export default function CorePreparationSection({ owners, participationTypes, committeeTypes, activity }) {
    return (
        <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden mb-10 transition-all hover:shadow-md duration-300">
            <div className="grid grid-cols-1 lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x divide-gray-100">
                {/* Left: Owners */}
                <div className="flex flex-col h-full hover:bg-gray-50/30 transition-colors">
                    <OwnerSection owners={owners} activity={activity} isEmbedded={true} />
                </div>

                {/* Middle: Participation Types */}
                <div className="flex flex-col h-full hover:bg-gray-50/30 transition-colors">
                    <ParticipationTypesSection participationTypes={participationTypes} activity={activity} isEmbedded={true} />
                </div>

                {/* Right: Committee Types */}
                <div className="flex flex-col h-full hover:bg-gray-50/30 transition-colors">
                    <CommitteeTypesSection committeeTypes={committeeTypes} activity={activity} isEmbedded={true} />
                </div>
            </div>
        </div>
    );
}
