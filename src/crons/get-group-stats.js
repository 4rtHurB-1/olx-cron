import AdvertListService from '../services/adverts-list';

export default {
    async execute() {
        await AdvertListService.getGroupStats();
    }
}