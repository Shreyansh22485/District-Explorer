

dim(dhcb_health_high)

colnames(dhcb_health_high)

dhcb_health_high.Scaled <- scale(dhcb_health_high[,3:51])


head(dhcb_health_high.Scaled)

str(dhcb_health_high.Scaled)


sum(is.na(dhcb_health_high.Scaled))

colnames(dhcb_health_high.Scaled)

lapply()
#[42] "Mobile.Health.Clinic.(Numbers)"                                     
#[43] "Mobile.Health.Clinic.Doctors.Total.Strength.(Numbers)"              
#[44] "Mobile.Health.Clinic.Doctors.In.Position.(Numbers)"  
dhcb_health_high.Scaled1<-dhcb_health_high.Scaled[,-c(42,43,44)]

wssplot <- function(data, nc=15, seed=3110){
  wss <- (nrow(data)-1)*sum(apply(data,2,var))
  for (i in 2:nc){
    set.seed(seed)
    wss[i] <- sum(kmeans(data, centers=i)$withinss)}
  plot(1:nc, wss, type="b", xlab="Number of Clusters",
       ylab="Within groups sum of squares")}

wssplot(dhcb_health_high.Scaled1, nc=5)


kmeans.clus = kmeans(x=dhcb_health_high.Scaled1, centers = 4)

dhcb_health_high$Clusters <- kmeans.clus$cluster


aggr = aggregate(dhcb_health_high[,-c(1,2,44,45,46)],list(dhcb_health_high$Clusters),mean)


colnames(dhcb_health_high)
write.csv(dhcb_health_high,file="dhcb_health_high.csv")

write.csv(aggr,file="dhcb_health_high1.csv")

getwd()
